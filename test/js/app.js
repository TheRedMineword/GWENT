/*!
 * Purify Video - shared JS
 * Vanilla JS only. No build step. Used by /index.html and /watch/index.html.
 */
(function (global) {
  'use strict';

  // ---------- Constants ----------
  // Single source of truth for the SkipVids handoff URL. Don't hardcode this elsewhere.
  var SKIPVIDS_BASE_URL    = 'https://skipvids.com/';
  var SKIPVIDS_WATCH_URL   = 'https://skipvids.com/watch?v=';
  var SKIPVIDS_NOADS_URL   = 'https://skipvids.com/youtube-no-ads';
  var SKIPVIDS_DOWNLOAD_URL = 'https://skipvids.com/download-app';
  var SKIPVIDS_DOWNLOAD_VIDEO_URL = 'https://skipvids.com/watch?v='; // best-effort placeholder; SkipVids handles download UX
  var PURIFY_OFFICIAL_DOMAIN = 'https://purify.video/';
  var HISTORY_LIMIT = 100;
  var DEFAULT_PLAYER_SIZE = 'normal';
  var PLAYER_SIZES = ['normal', 'theatre', 'compact', 'fit'];

  // Validators. YouTube video IDs are exactly 11 chars from [A-Za-z0-9_-].
  var VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
  // Playlist IDs vary in length (~13–42) but always start with letters and use the same charset.
  var PLAYLIST_ID_RE = /^[A-Za-z0-9_-]{13,42}$/;

  // ---------- localStorage helpers (never throw) ----------
  var ls = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    remove: function (k) { try { localStorage.removeItem(k); return true; } catch (e) { return false; } },
    getJSON: function (k, fallback) {
      try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
      catch (e) { return fallback; }
    },
    setJSON: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    }
  };

  // ---------- Start-time parsing ----------
  // YouTube accepts t=, start=, and (rarely) start_seconds=. Each can be:
  //   "60"      -> 60 seconds
  //   "60s"     -> 60 seconds
  //   "1h2m3s"  -> 3723 seconds (any subset of h/m/s, any order is unusual but we tolerate it)
  // Also support the "#t=60" hash form on youtu.be links.
  // Returns a non-negative integer second count, or 0 if not parseable.
  var MAX_START_SECONDS = 86400; // 24h - generous cap, guards against junk like "9999999999"
  function parseStartTime(raw) {
    if (raw == null) return 0;
    var s = String(raw).trim().toLowerCase();
    if (!s) return 0;
    if (/^\d+$/.test(s)) {
      var n = parseInt(s, 10);
      return isFinite(n) && n > 0 ? Math.min(n, MAX_START_SECONDS) : 0;
    }
    // Match any combination of NhNmNs (each part optional, must total > 0).
    var m = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!m) return 0;
    var h = m[1] ? parseInt(m[1], 10) : 0;
    var mn = m[2] ? parseInt(m[2], 10) : 0;
    var sc = m[3] ? parseInt(m[3], 10) : 0;
    if (!(h || mn || sc)) return 0;
    var total = h * 3600 + mn * 60 + sc;
    return total > 0 ? Math.min(total, MAX_START_SECONDS) : 0;
  }

  // Pull t / start / start_seconds out of a URLSearchParams + optional hash string.
  // Returns integer seconds (0 if none).
  function extractStartFromUrl(url) {
    var p = url.searchParams;
    var raw = p.get('t') || p.get('start') || p.get('start_seconds');
    var n = parseStartTime(raw);
    if (n) return n;
    // Hash fallback: #t=60 (common on youtu.be share links)
    var hash = (url.hash || '').replace(/^#/, '');
    if (hash) {
      // Hash can be just "t=60" or "60s" alone
      var hp = new URLSearchParams(hash);
      var hraw = hp.get('t') || hp.get('start');
      if (hraw) return parseStartTime(hraw);
      // Sometimes people use #60 or #1m30s as a bare value
      var bare = parseStartTime(hash);
      if (bare) return bare;
    }
    return 0;
  }

  // ---------- URL parsing ----------
  // Accept many YouTube formats + Purify legacy /?v=ENCODED_URL.
  // Return { videoId?, playlistId?, startSeconds? } or null.
  function parseInput(input) {
    if (input == null) return null;
    var trimmed = String(input).trim();
    if (!trimmed) return null;

    // Plain 11-char video ID.
    if (VIDEO_ID_RE.test(trimmed)) return { videoId: trimmed };

    // Plain playlist ID (rare, but support it).
    if (/^(PL|UU|LL|FL|RD|OL|UL|PU|TL)[A-Za-z0-9_-]{10,}$/.test(trimmed) && PLAYLIST_ID_RE.test(trimmed)) {
      return { playlistId: trimmed };
    }

    // Parse as URL. Add a protocol if missing so URL() doesn't choke.
    var url;
    try {
      var candidate = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
      url = new URL(candidate);
    } catch (e) {
      // Maybe the whole string is percent-encoded; try once decoded.
      try {
        var dec = decodeURIComponent(trimmed);
        if (dec && dec !== trimmed) return parseInput(dec);
      } catch (_) {}
      return null;
    }

    var host = url.hostname.toLowerCase().replace(/^www\./, '');
    var params = url.searchParams;

    // youtu.be/<id>
    if (host === 'youtu.be') {
      var shortId = url.pathname.replace(/^\/+/, '').split('/')[0] || '';
      var r = {};
      if (VIDEO_ID_RE.test(shortId)) r.videoId = shortId;
      var l1 = params.get('list');
      if (l1 && PLAYLIST_ID_RE.test(l1)) r.playlistId = l1;
      var t1 = extractStartFromUrl(url);
      if (t1) r.startSeconds = t1;
      return (r.videoId || r.playlistId) ? r : null;
    }

    // YouTube + variants
    var isYT = host === 'youtube.com' ||
               host === 'm.youtube.com' ||
               host === 'music.youtube.com' ||
               host === 'youtube-nocookie.com' ||
               host === 'gaming.youtube.com';

    if (isYT) {
      var path = url.pathname;
      var out = {};

      if (path === '/watch' || path === '/watch/') {
        var v = params.get('v');
        if (v && VIDEO_ID_RE.test(v)) out.videoId = v;
        var l = params.get('list');
        if (l && PLAYLIST_ID_RE.test(l)) out.playlistId = l;
      } else if (path.indexOf('/shorts/') === 0) {
        var sId = path.split('/')[2] || '';
        if (VIDEO_ID_RE.test(sId)) out.videoId = sId;
      } else if (path.indexOf('/embed/') === 0) {
        var eSeg = path.split('/')[2] || '';
        if (eSeg === 'videoseries') {
          var el = params.get('list');
          if (el && PLAYLIST_ID_RE.test(el)) out.playlistId = el;
        } else if (VIDEO_ID_RE.test(eSeg)) {
          out.videoId = eSeg;
          var el2 = params.get('list');
          if (el2 && PLAYLIST_ID_RE.test(el2)) out.playlistId = el2;
        }
      } else if (path.indexOf('/live/') === 0) {
        var lvId = path.split('/')[2] || '';
        if (VIDEO_ID_RE.test(lvId)) out.videoId = lvId;
      } else if (path.indexOf('/v/') === 0) {
        var vId = path.split('/')[2] || '';
        if (VIDEO_ID_RE.test(vId)) out.videoId = vId;
      } else if (path === '/playlist' || path === '/playlist/') {
        var pl = params.get('list');
        if (pl && PLAYLIST_ID_RE.test(pl)) out.playlistId = pl;
      }

      // Start time only makes sense when there's a videoId.
      if (out.videoId) {
        var t2 = extractStartFromUrl(url);
        if (t2) out.startSeconds = t2;
      }

      return (out.videoId || out.playlistId) ? out : null;
    }

    // Purify legacy: any host with ?v=<encoded YouTube URL>. Recurse on the decoded value.
    var vParam = params.get('v');
    if (vParam) {
      try {
        var decoded = decodeURIComponent(vParam);
        if (/^https?:\/\//i.test(decoded) || /youtube\.com|youtu\.be/i.test(decoded)) {
          var rec = parseInput(decoded);
          if (rec) {
            // Preserve list from the outer URL if the inner one missed it.
            if (!rec.playlistId) {
              var listOuter = params.get('list');
              if (listOuter && PLAYLIST_ID_RE.test(listOuter)) rec.playlistId = listOuter;
            }
            // Inner URL's start wins; otherwise fall back to outer ?t=
            if (!rec.startSeconds && rec.videoId) {
              var tOuter = extractStartFromUrl(url);
              if (tOuter) rec.startSeconds = tOuter;
            }
            return rec;
          }
        }
        if (VIDEO_ID_RE.test(decoded)) {
          var result = { videoId: decoded };
          var lo = params.get('list');
          if (lo && PLAYLIST_ID_RE.test(lo)) result.playlistId = lo;
          var tBare = extractStartFromUrl(url);
          if (tBare) result.startSeconds = tBare;
          return result;
        }
      } catch (_) {}
    }

    // Lone playlist param on any other host.
    var listOnly = params.get('list');
    if (listOnly && PLAYLIST_ID_RE.test(listOnly)) return { playlistId: listOnly };

    return null;
  }

  function buildWatchPath(parsed) {
    if (!parsed) return null;
    var p = new URLSearchParams();
    if (parsed.videoId) p.set('v', parsed.videoId);
    if (parsed.playlistId) p.set('list', parsed.playlistId);
    // Only include t= when there's a videoId (start time is meaningless for playlist-only).
    if (parsed.videoId && parsed.startSeconds && parsed.startSeconds > 0) {
      p.set('t', String(parsed.startSeconds));
    }
    var qs = p.toString();
    return qs ? '/watch?' + qs : null;
  }

  function buildWatchUrl(parsed) {
    var path = buildWatchPath(parsed);
    return path ? PURIFY_OFFICIAL_DOMAIN.replace(/\/$/, '') + path : null;
  }

  // ---------- History ----------
  var HISTORY_KEY = 'purify.history.v1';

  function getHistory() { return ls.getJSON(HISTORY_KEY, []) || []; }

  function historyKey(item) {
    return item.videoId ? 'v:' + item.videoId : (item.playlistId ? 'pl:' + item.playlistId : '');
  }

  function saveHistoryItem(item) {
    if (!item || (!item.videoId && !item.playlistId)) return;
    var key = historyKey(item);
    var list = getHistory().filter(function (h) { return historyKey(h) !== key; });
    list.unshift(Object.assign({ watchedAt: Date.now() }, item));
    if (list.length > HISTORY_LIMIT) list.length = HISTORY_LIMIT;
    ls.setJSON(HISTORY_KEY, list);
  }

  function updateHistoryItem(key, patch) {
    var list = getHistory();
    var changed = false;
    for (var i = 0; i < list.length; i++) {
      if (historyKey(list[i]) === key) {
        list[i] = Object.assign({}, list[i], patch);
        changed = true;
        break;
      }
    }
    if (changed) ls.setJSON(HISTORY_KEY, list);
  }

  function deleteHistoryItem(key) {
    var list = getHistory().filter(function (h) { return historyKey(h) !== key; });
    ls.setJSON(HISTORY_KEY, list);
  }

  function clearHistory() { ls.setJSON(HISTORY_KEY, []); }

  // ---------- oEmbed (best-effort title/thumbnail) ----------
  function fetchOEmbed(videoId) {
    var u = 'https://www.youtube.com/oembed?url=' +
            encodeURIComponent('https://www.youtube.com/watch?v=' + videoId) +
            '&format=json';
    return fetch(u, { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // ---------- Tiny helpers ----------
  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent || '');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatDuration(seconds) {
    if (seconds == null || !isFinite(seconds) || seconds < 0) return '';
    seconds = Math.round(seconds);
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    return h > 0 ? (h + ':' + pad(m) + ':' + pad(s)) : (m + ':' + pad(s));
  }

  // ---------- Theme ----------
  var THEME_KEY = 'purify.theme';
  function applyTheme(t) {
    if (t !== 'light' && t !== 'dark') t = '';
    if (t) document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  function initTheme() {
    applyTheme(ls.get(THEME_KEY) || '');
  }
  function toggleTheme() {
    var current = ls.get(THEME_KEY);
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var effective = current || (prefersDark ? 'dark' : 'light');
    var next = effective === 'dark' ? 'light' : 'dark';
    ls.set(THEME_KEY, next);
    applyTheme(next);
    return next;
  }

  // ---------- Public surface ----------
  var Purify = {
    // constants
    SKIPVIDS_BASE_URL: SKIPVIDS_BASE_URL,
    SKIPVIDS_WATCH_URL: SKIPVIDS_WATCH_URL,
    SKIPVIDS_NOADS_URL: SKIPVIDS_NOADS_URL,
    SKIPVIDS_DOWNLOAD_URL: SKIPVIDS_DOWNLOAD_URL,
    SKIPVIDS_DOWNLOAD_VIDEO_URL: SKIPVIDS_DOWNLOAD_VIDEO_URL,
    PURIFY_OFFICIAL_DOMAIN: PURIFY_OFFICIAL_DOMAIN,
    HISTORY_LIMIT: HISTORY_LIMIT,
    DEFAULT_PLAYER_SIZE: DEFAULT_PLAYER_SIZE,
    PLAYER_SIZES: PLAYER_SIZES,
    VIDEO_ID_RE: VIDEO_ID_RE,
    PLAYLIST_ID_RE: PLAYLIST_ID_RE,

    // utils
    ls: ls,
    parseInput: parseInput,
    parseStartTime: parseStartTime,
    buildWatchPath: buildWatchPath,
    buildWatchUrl: buildWatchUrl,
    historyKey: historyKey,
    getHistory: getHistory,
    saveHistoryItem: saveHistoryItem,
    updateHistoryItem: updateHistoryItem,
    deleteHistoryItem: deleteHistoryItem,
    clearHistory: clearHistory,
    fetchOEmbed: fetchOEmbed,
    isMobile: isMobile,
    isAndroid: isAndroid,
    escapeHtml: escapeHtml,
    formatDuration: formatDuration,
    initTheme: initTheme,
    toggleTheme: toggleTheme
  };

  global.Purify = Purify;

  // Auto-apply saved theme as early as possible to avoid flash.
  try { initTheme(); } catch (_) {}
})(window);
