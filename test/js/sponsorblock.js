/*!
 * Purify Video - SponsorBlock integration.
 *
 * Self-contained, optional. Failure here must never break playback.
 * Public API:
 *   PurifySponsorBlock.attach(ytPlayer, videoId, { onSkip, onSegments, onActiveSegment, onInactiveSegment })
 *   PurifySponsorBlock.detach()
 *   PurifySponsorBlock.isEnabled()
 *   PurifySponsorBlock.setEnabled(bool)
 *   PurifySponsorBlock.skipSegment(segment)
 *   PurifySponsorBlock.getSegments()
 */
(function (global) {
  'use strict';

  var ENABLED_KEY = 'purify.sponsorblock.enabled';
  var API = 'https://sponsor.ajay.app/api/skipSegments';
  var FETCH_CATEGORIES = ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'preview', 'music_offtopic', 'filler'];
  var POLL_MS = 350;
  var MIN_SEG_LEN = 0.5; // ignore micro-segments that cause stutter

  var CATEGORY_LABELS = {
    sponsor: 'Sponsor message',
    selfpromo: 'Self-promotion',
    interaction: 'Interaction reminder',
    intro: 'Intro',
    outro: 'Outro',
    preview: 'Preview / recap',
    music_offtopic: 'Music / off-topic',
    filler: 'Filler'
  };

  var state = {
    player: null,
    videoId: null,
    segments: [],
    poller: null,
    onSkip: null,
    onSegments: null,
    onActiveSegment: null,
    onInactiveSegment: null,
    activeKey: null,
    skippedKeys: {},
    aborted: false
  };

  function ls(k, v) {
    try {
      if (arguments.length === 1) return localStorage.getItem(k);
      localStorage.setItem(k, v); return true;
    } catch (e) { return arguments.length === 1 ? null : false; }
  }

  function isEnabled() {
    // Default ON. User has to actively disable.
    var v = ls(ENABLED_KEY);
    return v == null ? true : v === '1';
  }

  function setEnabled(on) {
    ls(ENABLED_KEY, on ? '1' : '0');
    if (!on) {
      stopPolling();
      notifyInactive();
    } else if (state.player && state.videoId) {
      startPolling();
    }
  }

  function categoryLabel(category) {
    return CATEGORY_LABELS[category] || String(category || 'SponsorBlock segment').replace(/_/g, ' ');
  }

  function segmentKey(seg) {
    return [seg.category || 'segment', Math.round(seg.start * 10), Math.round(seg.end * 10)].join(':');
  }

  function fetchSegments(videoId) {
    var url = API + '?videoID=' + encodeURIComponent(videoId) +
              '&categories=' + encodeURIComponent(JSON.stringify(FETCH_CATEGORIES));
    return fetch(url, { credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) return [];
        return r.json();
      })
      .then(function (data) {
        if (!Array.isArray(data)) return [];
        var segs = [];
        for (var i = 0; i < data.length; i++) {
          var seg = data[i] && data[i].segment;
          if (!seg || seg.length !== 2) continue;
          var start = +seg[0], end = +seg[1];
          if (!isFinite(start) || !isFinite(end)) continue;
          if (end - start < MIN_SEG_LEN) continue;
          var category = data[i].category || 'sponsor';
          var out = {
            start: start,
            end: end,
            category: category,
            label: categoryLabel(category)
          };
          out.key = segmentKey(out);
          segs.push(out);
        }
        segs.sort(function (a, b) { return a.start - b.start; });
        return segs;
      })
      .catch(function () { return []; });
  }

  function startPolling() {
    stopPolling();
    if (!isEnabled()) return;
    state.poller = setInterval(tick, POLL_MS);
  }

  function stopPolling() {
    if (state.poller) { clearInterval(state.poller); state.poller = null; }
  }

  function notifyActive(seg) {
    if (!seg) return notifyInactive();
    if (state.activeKey === seg.key) return;
    state.activeKey = seg.key;
    if (typeof state.onActiveSegment === 'function') {
      try { state.onActiveSegment(seg); } catch (_) {}
    }
  }

  function notifyInactive() {
    if (!state.activeKey) return;
    state.activeKey = null;
    if (typeof state.onInactiveSegment === 'function') {
      try { state.onInactiveSegment(); } catch (_) {}
    }
  }

  function findActiveSegment(t) {
    for (var i = 0; i < state.segments.length; i++) {
      var s = state.segments[i];
      if (t >= s.start - 0.1 && t < s.end - 0.25) return s;
    }
    return null;
  }

  function skipSegment(seg, manual) {
    if (!state.player || !seg) return false;
    try {
      // Nudge just beyond the end so the polling loop does not immediately re-detect the same segment.
      state.player.seekTo(Math.max(0, seg.end + 0.05), true);
      if (state.player.playVideo) {
        setTimeout(function () {
          try { state.player.playVideo(); } catch (_) {}
        }, 40);
      }
      state.skippedKeys[seg.key || segmentKey(seg)] = true;
      notifyInactive();
      if (typeof state.onSkip === 'function') {
        try { state.onSkip(seg, { manual: !!manual }); } catch (_) {}
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  function tick() {
    if (!state.player || !state.segments.length) return;
    var t;
    try { t = state.player.getCurrentTime(); } catch (e) { return; }
    if (!isFinite(t)) return;

    var active = findActiveSegment(t);
    if (!active) {
      notifyInactive();
      return;
    }

    notifyActive(active);

    // Auto-skip once. If the viewer scrubs back into the same segment afterwards,
    // let them watch it and show the manual skip button instead.
    if (!state.skippedKeys[active.key]) {
      skipSegment(active, false);
    }
  }

  function attach(ytPlayer, videoId, opts) {
    detach();
    if (!ytPlayer || !videoId) return;
    opts = opts || {};
    state.player = ytPlayer;
    state.videoId = videoId;
    state.onSkip = opts.onSkip || null;
    state.onSegments = opts.onSegments || null;
    state.onActiveSegment = opts.onActiveSegment || null;
    state.onInactiveSegment = opts.onInactiveSegment || null;
    state.aborted = false;
    state.activeKey = null;
    state.skippedKeys = {};
    state.segments = [];

    if (!isEnabled()) return;

    fetchSegments(videoId).then(function (segs) {
      if (state.aborted || state.videoId !== videoId) return;
      state.segments = segs || [];
      if (typeof state.onSegments === 'function') {
        try { state.onSegments(state.segments.slice()); } catch (_) {}
      }
      if (state.segments.length) startPolling();
    });
  }

  function detach() {
    notifyInactive();
    state.aborted = true;
    stopPolling();
    state.player = null;
    state.videoId = null;
    state.segments = [];
    state.activeKey = null;
    state.skippedKeys = {};
    state.onSkip = null;
    state.onSegments = null;
    state.onActiveSegment = null;
    state.onInactiveSegment = null;
  }

  global.PurifySponsorBlock = {
    attach: attach,
    detach: detach,
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    skipSegment: function (seg) { return skipSegment(seg, true); },
    getSegments: function () { return state.segments.slice(); },
    labelCategory: categoryLabel
  };
})(window);
