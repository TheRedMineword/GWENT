/*
  premiumtimer.js — Purify Video soft usage timer + Buy Me a Coffee unlock

  What this does:
  - Free users get a daily watch-time limit.
  - Supporters bypass the limit using a token saved in localStorage.
  - A warning ribbon appears before the limit.
  - The ribbon has "Unlock unlimited" and "Already a member?" links.
  - When the limit is reached, the current video is allowed to finish.
  - A soft upsell iframe can appear shortly before the current video ends.
  - The paywall appears before the next video starts.
  - On desktop, hidden-tab time can still be counted if the video was playing.

  Basic install:
  <script src="/members/premiumtimer.js"></script>

  For best accuracy, call these from your player events:
  - window.startPurifyCounting(); when video starts/plays
  - window.stopPurifyCounting(); when video pauses/ends

  Before loading a new video, call:

  if (window.purifyBeforeNewVideo && !window.purifyBeforeNewVideo()) {
    return;
  }

  To show the soft upsell shortly before the current video ends, call this
  from your player while the video is playing:

  window.purifyCheckVideoEndUpsell(currentSeconds, durationSeconds);
*/

(function () {
  'use strict';

  // ==============================
  // CONFIG
  // ==============================

 // 60 minutes/day.
var LIMIT_SECS = 60 * 60;

// Warning appears at 50 minutes used.
// That means about 10 minutes left.
var WARNING_AT_SECS = 50 * 60;

  // Show the upsell iframe this many seconds before the current video ends,
  // but only after the user has already reached today's free limit.
  var VIDEO_END_UPSELL_SECS = 20;

  // Where the upsell page lives.
  var UPSELL_URL = 'https://purify.video/members/upsell.html';

  // Where existing members verify their email.
  var VERIFY_URL = 'https://purify.video/members/unlock.html';

  // Buy Me a Coffee membership page.
  var BMC_MEMBERSHIP_URL = 'https://buymeacoffee.com/purify.video/membership';

  // Show the limit ribbon until the page reloads or the user unlocks.
  // Make it permanent by setting duration to 0.
  var LIMIT_RIBBON_DURATION_MS = 0;

  // If using iframe replacement mode, this must match your YouTube/player iframe id.
  var PLAYER_ID = 'ytPlayerIframe';

  // Options: 'overlay' or 'iframe'
  var PAYWALL_MODE = 'overlay';

  // false = only count when your player calls window.startPurifyCounting().
  var AUTO_COUNT_WHILE_VISIBLE = false;

  // Count hidden-tab time if the video was playing before the tab went hidden.
  // Useful on desktop where video keeps playing but setInterval pauses/throttles.
  var COUNT_HIDDEN_TIME_WHEN_COUNTING = true;

  // localStorage keys.
  var QUOTA_KEY = 'pv_daily_quota_v1';
  var SUPPORTER_TOKEN_KEY = 'pv_supporter_token';
  var WARNING_KEY_PREFIX = 'pv_warning_seen_';

  var TICK_MS = 1000;

  // ==============================
  // INTERNAL STATE
  // ==============================

  var tickTimer = null;
  var counting = false;
  var hiddenStartedAt = 0;

  // True after the limit is reached during the current video.
  var limitReachedButAllowCurrentVideo = false;

  // Prevent duplicate overlays.
  var paywallShownThisPage = false;

  // Prevent the soft video-end upsell appearing more than once per page/video.
  var videoEndUpsellShownThisVideo = false;

  // ==============================
  // SUPPORTER TOKEN CHECK
  // ==============================

  function decodeBase64Url(str) {
    str = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return atob(str);
  }

  function readSupporterToken() {
    var token = localStorage.getItem(SUPPORTER_TOKEN_KEY) || '';

    if (token.indexOf('.') === -1) {
      return null;
    }

    try {
      var body = token.split('.')[0];
      var payload = JSON.parse(decodeBase64Url(body));
      var now = Math.floor(Date.now() / 1000);

      if (!payload || !payload.exp || now >= payload.exp) {
        return null;
      }

      if (payload.scope !== 'purify_supporter') {
        return null;
      }

      return payload;
    } catch (e) {
      return null;
    }
  }

  function hasSupporterToken() {
    return !!readSupporterToken();
  }

  // If supporter is already unlocked, expose safe helpers and stop.
  if (hasSupporterToken()) {
    window.startPurifyCounting = function () {};
    window.stopPurifyCounting = function () {};
    window.purifyBeforeNewVideo = function () {
      return true;
    };
    window.purifyCurrentVideoFinished = function () {};
    window.purifyCheckVideoEndUpsell = function () {};
    window.purifyResetVideoEndUpsell = function () {};

    window.PurifyMembership = {
      startCounting: function () {},
      stopCounting: function () {},
      showPaywall: function () {},
      secondsLeft: function () {
        return Infinity;
      },
      hasSupporterToken: hasSupporterToken,
      beforeNewVideo: function () {
        return true;
      },
      currentVideoFinished: function () {},
      checkVideoEndUpsell: function () {},
      resetVideoEndUpsell: function () {}
    };

    return;
  }

  // ==============================
  // DAILY QUOTA HELPERS
  // ==============================

  function todayKey(d) {
    d = d || new Date();

    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  }

  function readQuota() {
    try {
      return JSON.parse(localStorage.getItem(QUOTA_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function writeQuota(obj) {
    localStorage.setItem(QUOTA_KEY, JSON.stringify(obj));
  }

  function getTodayQuota() {
    var q = readQuota();
    var today = todayKey();

    if (!q[today]) {
      q[today] = {
        used: 0,
        limit_reached: false
      };
    }

    // Keep only today's data.
    Object.keys(q).forEach(function (key) {
      if (key !== today) {
        delete q[key];
      }
    });

    writeQuota(q);

    return q[today];
  }

  function saveTodayQuota(todayObj) {
    var q = readQuota();
    q[todayKey()] = todayObj;
    writeQuota(q);
  }

  function secondsLeft() {
    var t = getTodayQuota();
    return Math.max(0, LIMIT_SECS - Number(t.used || 0));
  }

  function isLimitReached() {
    return secondsLeft() <= 0;
  }

  function formatMins(secs) {
    return Math.max(1, Math.ceil(secs / 60));
  }

  // ==============================
  // BOTTOM RIBBON
  // ==============================

  function getNextResetDate() {
    var now = new Date();

    // Your daily quota uses the visitor's local browser date,
    // so the reset is their next local midnight.
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0
    );
  }

  function formatResetDateTime() {
    var reset = getNextResetDate();

    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit'
      }).format(reset);
    } catch (e) {
      // Simple fallback if Intl fails.
      return reset.toLocaleString();
    }
  }

  function openVerifyOverlay() {
    showFrameOverlay({
      id: 'pvVerifyOverlay',
      src: VERIFY_URL,
      title: 'Verify Purify Supporter',
      closable: true
    });
  }

  function createLimitRibbon(id, text, showLinks, durationMs) {
    var existing = document.getElementById(id);

    if (existing) {
      existing.remove();
    }

    var ribbon = document.createElement('div');
    ribbon.id = id;

    ribbon.style.cssText = [
      'position:fixed',
      'left:0',
      'right:0',
      'bottom:0',
      'z-index:2147483646',
      'background:#001845',
      'color:#fff',
      'font-family:system-ui,Arial,sans-serif',
      'box-shadow:0 -8px 30px rgba(0,0,0,.28)',
      'border-top:1px solid rgba(255,255,255,.12)',
      'padding:12px max(14px,env(safe-area-inset-left)) calc(12px + env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left))'
    ].join(';');

    var inner = document.createElement('div');

    inner.style.cssText = [
      'max-width:1100px',
      'margin:0 auto',
      'display:grid',
      'grid-template-columns:1fr auto',
      'align-items:center',
      'gap:14px'
    ].join(';');

    var message = document.createElement('div');
    message.textContent = text;

    message.style.cssText = [
      'font-size:14px',
      'font-weight:750',
      'line-height:1.35',
      'text-align:left'
    ].join(';');

    inner.appendChild(message);

    if (showLinks) {
      var actions = document.createElement('div');

      actions.style.cssText = [
        'display:flex',
        'align-items:center',
        'justify-content:flex-end',
        'gap:10px',
        'white-space:nowrap'
      ].join(';');

      var unlockLink = document.createElement('a');
      unlockLink.href = BMC_MEMBERSHIP_URL;
      unlockLink.target = '_blank';
      unlockLink.rel = 'noopener';
      unlockLink.textContent = 'Unlock unlimited';

      unlockLink.style.cssText = [
        'background:#ff5e3a',
        'color:#fff',
        'text-decoration:none',
        'padding:9px 12px',
        'border-radius:999px',
        'font-size:13px',
        'font-weight:850',
        'display:inline-flex',
        'align-items:center',
        'justify-content:center'
      ].join(';');

      var verifyLink = document.createElement('button');
      verifyLink.type = 'button';
      verifyLink.textContent = 'Already a member?';

      verifyLink.style.cssText = [
        'background:transparent',
        'border:0',
        'color:#fff',
        'text-decoration:underline',
        'text-underline-offset:3px',
        'font-family:inherit',
        'font-size:13px',
        'font-weight:750',
        'cursor:pointer',
        'padding:8px 0'
      ].join(';');

      verifyLink.addEventListener('click', function () {
        openVerifyOverlay();
      });

      actions.appendChild(unlockLink);
      actions.appendChild(verifyLink);
      inner.appendChild(actions);
    }

    ribbon.appendChild(inner);
    document.body.appendChild(ribbon);

    // Mobile layout: message on top, actions underneath.
    if (window.innerWidth < 640) {
      inner.style.gridTemplateColumns = '1fr';

      var actionsMobile = ribbon.querySelector('div div:nth-child(2)');
      if (actionsMobile) {
        actionsMobile.style.justifyContent = 'flex-start';
        actionsMobile.style.flexWrap = 'wrap';
        actionsMobile.style.whiteSpace = 'normal';
      }
    }

    // If duration is 0, leave the ribbon there.
    if (durationMs && durationMs > 0) {
      setTimeout(function () {
        if (ribbon && ribbon.parentNode) {
          ribbon.parentNode.removeChild(ribbon);
        }
      }, durationMs);
    }
  }

  function showWarningIfNeeded(usedSecs) {
    var today = todayKey();
    var warningKey = WARNING_KEY_PREFIX + today;

    if (usedSecs < WARNING_AT_SECS) {
      return;
    }

    if (localStorage.getItem(warningKey) === '1') {
      return;
    }

    localStorage.setItem(warningKey, '1');

    createLimitRibbon(
      'pvLimitWarningRibbon',
      'Purify Video: about ' + formatMins(LIMIT_SECS - usedSecs) + ' free minutes left today.',
      true,
      12000
    );
  }

  function showLimitReachedToast() {
    createLimitRibbon(
      'pvLimitReachedRibbon',
      'We’ll let this video finish, but the next one is blocked until your free time resets at ' + formatResetDateTime() + '.',
      true,
      LIMIT_RIBBON_DURATION_MS
    );
  }

  // ==============================
  // IFRAME OVERLAYS
  // ==============================

  function showFrameOverlay(options) {
    options = options || {};

    var id = options.id || 'pvFrameOverlay';
    var src = options.src || UPSELL_URL;
    var title = options.title || 'Purify Video Supporter';
    var closable = options.closable === true;

    if (document.getElementById(id)) {
      return;
    }

    var overlay = document.createElement('div');
    overlay.id = id;

    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'background:rgba(0,0,0,.72)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:16px'
    ].join(';');

    var card = document.createElement('div');

    card.style.cssText = [
      'position:relative',
      'width:min(720px,100%)',
      'height:min(620px,92vh)',
      'border-radius:18px',
      'background:#fff',
      'box-shadow:0 20px 70px rgba(0,0,0,.45)',
      'overflow:hidden'
    ].join(';');

    if (closable) {
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '×';
      closeBtn.setAttribute('aria-label', 'Close');

      closeBtn.style.cssText = [
        'position:absolute',
        'top:10px',
        'right:10px',
        'z-index:2',
        'width:34px',
        'height:34px',
        'border:0',
        'border-radius:999px',
        'background:rgba(0,0,0,.68)',
        'color:#fff',
        'font-size:22px',
        'line-height:1',
        'cursor:pointer'
      ].join(';');

      closeBtn.addEventListener('click', function () {
        overlay.remove();
      });

      card.appendChild(closeBtn);
    }

    var frame = document.createElement('iframe');
    frame.src = src;
    frame.title = title;

    frame.style.cssText = [
      'width:100%',
      'height:100%',
      'border:0',
      'display:block',
      'background:#fff'
    ].join(';');

    card.appendChild(frame);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // ==============================
  // PAYWALL UI
  // ==============================

  function buildUpsellUrl() {
    return UPSELL_URL + '?reason=quota&limit=' + encodeURIComponent(LIMIT_SECS);
  }

  function removePurifyPlayerDecorations() {
    [
      '.static-noise',
      '.overlay',
      '.volume-steps',
      '.smpte',
      '#popup-content'
    ].forEach(function (sel) {
      var el = document.querySelector(sel);

      if (el) {
        el.remove();
      }
    });
  }

  function showVideoEndUpsell() {
    showFrameOverlay({
      id: 'pvVideoEndUpsellOverlay',
      src: buildUpsellUrl() + '&mode=video_end',
      title: 'Support Purify Video',
      closable: true
    });
  }

  function showPaywall() {
    if (paywallShownThisPage) {
      return;
    }

    paywallShownThisPage = true;
    stopCounting();

    var t = getTodayQuota();
    t.limit_reached = true;
    saveTodayQuota(t);

    if (PAYWALL_MODE === 'iframe') {
      var iframe = document.getElementById(PLAYER_ID);

      if (iframe) {
        iframe.src = buildUpsellUrl();
        iframe.style.pointerEvents = 'auto';
        removePurifyPlayerDecorations();
        return;
      }
    }

    showFrameOverlay({
      id: 'pvPaywallOverlay',
      src: buildUpsellUrl(),
      title: 'Purify Video Supporter',
      closable: false
    });
  }

  // ==============================
  // USAGE ADDING
  // ==============================

  function addUsageSeconds(amount) {
    amount = Math.max(0, Math.floor(Number(amount || 0)));

    if (!amount) {
      return;
    }

    if (limitReachedButAllowCurrentVideo) {
      return;
    }

    var t = getTodayQuota();

    if (Number(t.used || 0) >= LIMIT_SECS) {
      markLimitReachedButAllowCurrentVideo();
      return;
    }

    t.used = Number(t.used || 0) + amount;
    saveTodayQuota(t);

    showWarningIfNeeded(t.used);

    if (t.used >= LIMIT_SECS) {
      markLimitReachedButAllowCurrentVideo();
    }
  }

  // ==============================
  // LIMIT BEHAVIOUR
  // ==============================

  function markLimitReachedButAllowCurrentVideo() {
    if (limitReachedButAllowCurrentVideo) {
      return;
    }

    var t = getTodayQuota();

    t.used = Math.max(Number(t.used || 0), LIMIT_SECS);
    t.limit_reached = true;

    saveTodayQuota(t);

    limitReachedButAllowCurrentVideo = true;

    stopCounting();
    showLimitReachedToast();
  }

  function beforeNewVideo() {
    // Call this before loading/changing the video.
    // If false, do not load the next video.
    if (isLimitReached() || limitReachedButAllowCurrentVideo) {
      showPaywall();
      return false;
    }

    return true;
  }

  function currentVideoFinished() {
    // Call this when YouTube says the video ended.
    if (isLimitReached() || limitReachedButAllowCurrentVideo) {
      showPaywall();
    }
  }

  function resetVideoEndUpsell() {
    // Call this when a genuinely new video starts/loads.
    videoEndUpsellShownThisVideo = false;
  }

  function checkVideoEndUpsell(currentSeconds, durationSeconds) {
    currentSeconds = Number(currentSeconds || 0);
    durationSeconds = Number(durationSeconds || 0);

    // Only show this after the free limit has been reached.
    // We are still letting the current video finish.
    if (!limitReachedButAllowCurrentVideo && !isLimitReached()) {
      return;
    }

    // Do not show twice for the same video/page.
    if (videoEndUpsellShownThisVideo) {
      return;
    }

    // Need a real duration.
    if (!durationSeconds || !isFinite(durationSeconds) || durationSeconds <= 0) {
      return;
    }

    var secondsUntilEnd = durationSeconds - currentSeconds;

    // Show upsell shortly before the actual video ends.
    if (secondsUntilEnd <= VIDEO_END_UPSELL_SECS && secondsUntilEnd > 0) {
      videoEndUpsellShownThisVideo = true;
      showVideoEndUpsell();
    }
  }

  // ==============================
  // TIMER
  // ==============================

  function tick() {
    if (!counting) {
      return;
    }

    if (document.visibilityState !== 'visible') {
      return;
    }

    addUsageSeconds(1);
  }

  function startTicker() {
    if (!tickTimer) {
      tickTimer = setInterval(tick, TICK_MS);
    }
  }

  function stopTicker() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function startCounting() {
    if (isLimitReached() && !limitReachedButAllowCurrentVideo) {
      showPaywall();
      return;
    }

    counting = true;

    if (document.visibilityState === 'visible') {
      startTicker();
    }
  }

  function stopCounting() {
    counting = false;
    hiddenStartedAt = 0;
    stopTicker();
  }

  // ==============================
  // PUBLIC FUNCTIONS
  // ==============================

  window.startPurifyCounting = startCounting;
  window.stopPurifyCounting = stopCounting;

  window.purifyBeforeNewVideo = beforeNewVideo;
  window.purifyCurrentVideoFinished = currentVideoFinished;
  window.purifyCheckVideoEndUpsell = checkVideoEndUpsell;
  window.purifyResetVideoEndUpsell = resetVideoEndUpsell;

  window.PurifyMembership = {
    startCounting: startCounting,
    stopCounting: stopCounting,
    showPaywall: showPaywall,
    secondsLeft: secondsLeft,
    hasSupporterToken: hasSupporterToken,
    beforeNewVideo: beforeNewVideo,
    currentVideoFinished: currentVideoFinished,
    checkVideoEndUpsell: checkVideoEndUpsell,
    resetVideoEndUpsell: resetVideoEndUpsell,
    openVerifyOverlay: openVerifyOverlay
  };

  // ==============================
  // PAGE EVENTS
  // ==============================

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      if (COUNT_HIDDEN_TIME_WHEN_COUNTING && counting) {
        hiddenStartedAt = Date.now();
      }

      stopTicker();
      return;
    }

    if (document.visibilityState === 'visible') {
      if (COUNT_HIDDEN_TIME_WHEN_COUNTING && counting && hiddenStartedAt) {
        var elapsed = Math.floor((Date.now() - hiddenStartedAt) / 1000);
        hiddenStartedAt = 0;

        // Count time that passed while hidden.
        // This assumes the video kept playing.
        addUsageSeconds(elapsed);
      }

      if (counting) {
        startTicker();
      }
    }
  });

  // Messages from upsell.html or unlock.html after successful verification.
  window.addEventListener('message', function (event) {
    var data = event.data || {};

    if (
      data.type === 'PV_REQUEST_PARENT_RELOAD' ||
      data.type === 'PV_SUPPORTER_UNLOCKED'
    ) {
      window.location.reload();
    }
  });

  // ==============================
  // STARTUP
  // ==============================

  // If already over today's quota on page load, show the paywall immediately.
  if (isLimitReached()) {
    showPaywall();
    return;
  }

  if (AUTO_COUNT_WHILE_VISIBLE) {
    startCounting();
  }
})();