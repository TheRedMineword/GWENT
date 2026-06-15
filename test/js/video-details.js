/*!
 * Purify Video - video details / chapters
 * Fetches Piped /streams/:videoId and renders description + jumpable chapters.
 */
(function (global) {
  'use strict';

  var P = global.Purify;
  if (!P) return;

  // Piped instances to try, in order.
  // Add more root instance URLs here if one starts failing.
  var API_BASES = [
    'https://api.piped.private.coffee',
    'https://piped.wireway.ch'
  ];

  // How long we wait for one Piped instance before trying the next one.
  var FETCH_TIMEOUT_MS = 8500;

  var currentPlayer = null;
  var currentVideoId = null;

  // Used to cancel the current Piped request if the video changes.
  var controller = null;

  // Cached page elements used by this file.
  var els = {};

  function byId(id) {
    return document.getElementById(id);
  }

  // Find and cache all the HTML elements this file updates.
  function ensureEls() {
    if (els.ready) return true;

    els.section = byId('videoDetails');
    els.title = byId('videoDetailsHeading');
    els.meta = byId('videoDetailsMeta');
    els.chapters = byId('videoChapters');
    els.chapterList = byId('videoChapterList');
    els.descWrap = byId('videoDescriptionWrap');
    els.desc = byId('videoDescription');
    els.toggle = byId('videoDescriptionToggle');

    els.ready = !!(
      els.section &&
      els.title &&
      els.meta &&
      els.chapters &&
      els.chapterList &&
      els.descWrap &&
      els.desc &&
      els.toggle
    );

    if (els.ready) wireEvents();

    return els.ready;
  }

  // Reset the details area and cancel any request still running.
  function clear() {
    if (controller) {
      try { controller.abort(); } catch (_) {}
      controller = null;
    }

    if (!ensureEls()) return;

    els.section.hidden = true;
    els.title.textContent = 'Description';
    els.meta.textContent = '';
    els.chapterList.innerHTML = '';
    els.chapters.hidden = true;
    els.desc.innerHTML = '';
    els.desc.classList.add('video-description-collapsed');
    els.descWrap.hidden = true;
    els.toggle.hidden = true;
    els.toggle.textContent = 'Show more';
  }

  // Convert timestamps like 1:23 or 01:02:33 into seconds.
  function parseTimeToSeconds(raw) {
    if (raw == null) return 0;

    var str = String(raw).trim();
    if (!str) return 0;

    if (/^\d+(?:\.\d+)?$/.test(str)) {
      var n = parseFloat(str);
      return isFinite(n) && n >= 0 ? n : 0;
    }

    var parts = str.split(':').map(function (p) {
      return parseInt(p, 10);
    });

    if (parts.some(function (p) {
      return !isFinite(p);
    })) {
      return 0;
    }

    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];

    return 0;
  }

  // Clean up chapter titles.
  function compactTitle(s) {
    return String(s || '')
      .replace(/^[-–—:|\s]+/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Turn things like &amp; and &quot; back into normal characters.
  function decodeHtmlEntities(raw) {
    var s = String(raw == null ? '' : raw);

    if (s.indexOf('&') === -1) return s;

    try {
      var textarea = document.createElement('textarea');
      textarea.innerHTML = s;
      return textarea.value;
    } catch (_) {
      return s;
    }
  }

  // Check whether a string appears to contain HTML tags.
  function looksLikeHtml(s) {
    return /<\/?[a-z][\s\S]*>/i.test(String(s || ''));
  }

  // Convert HTML into plain text while keeping useful line breaks.
  function htmlToPlainText(html) {
    if (typeof DOMParser === 'undefined') {
      return String(html || '')
        .replace(/<\s*br\s*\/?\s*>/gi, '\n')
        .replace(/<\s*\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
        .replace(/<[^>]+>/g, '');
    }

    var doc;

    try {
      doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    } catch (_) {
      return String(html || '').replace(/<[^>]+>/g, '');
    }

    var out = [];

    var blockTags = {
      address: 1,
      article: 1,
      aside: 1,
      blockquote: 1,
      div: 1,
      dl: 1,
      fieldset: 1,
      figcaption: 1,
      figure: 1,
      footer: 1,
      form: 1,
      h1: 1,
      h2: 1,
      h3: 1,
      h4: 1,
      h5: 1,
      h6: 1,
      header: 1,
      hr: 1,
      li: 1,
      main: 1,
      nav: 1,
      ol: 1,
      p: 1,
      pre: 1,
      section: 1,
      table: 1,
      ul: 1
    };

    function append(text) {
      if (!text) return;
      out.push(text);
    }

    function newline() {
      if (!out.length) return;

      var last = out[out.length - 1];
      if (last && /\n$/.test(last)) return;

      out.push('\n');
    }

    function walk(node) {
      if (!node) return;

      if (node.nodeType === 3) {
        append(node.nodeValue || '');
        return;
      }

      if (node.nodeType !== 1) return;

      var tag = String(node.tagName || '').toLowerCase();

      if (tag === 'br') {
        newline();
        return;
      }

      var isBlock = !!blockTags[tag];

      if (isBlock) newline();

      if (tag === 'a') {
        var text = (node.textContent || '').replace(/\s+/g, ' ').trim();
        var href = (node.getAttribute('href') || '').trim();
        append(text || href);
      } else {
        Array.prototype.forEach.call(node.childNodes || [], walk);
      }

      if (isBlock) newline();
    }

    Array.prototype.forEach.call(doc.body.childNodes || [], walk);

    return out.join('');
  }

  // Turn HTML or escaped HTML descriptions into plain text.
  function normaliseDescriptionText(description) {
    var text = String(description == null ? '' : description);

    /*
      Piped instances sometimes return YouTube's description as HTML.
      Sometimes that HTML is entity-escaped too.

      Decode twice so this:
      &lt;a href=&quot;...&quot;&gt;

      can become real HTML, then we turn it into plain text.
    */
    for (var i = 0; i < 2; i++) {
      var decoded = decodeHtmlEntities(text);

      if (decoded === text) break;

      text = decoded;
    }

    if (looksLikeHtml(text)) {
      text = htmlToPlainText(text);
    }

    return String(text || '')
      .replace(/\r\n?/g, '\n')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Some descriptions contain chapter lines.
  // Remove those lines so chapters are not shown twice.
  function stripChapterLinesFromDescription(description, chapters) {
    var text = String(description || '');

    if (!chapters || !chapters.length || !text) return text;

    var lines = text.split(/\r?\n/);
    var kept = [];

    var chapterLineRe = /^\s*(?:[-*•]|\d+[.)])?\s*(?:\[|\()?((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\]|\))?\s*(?:[-–—:|]\s*|\s+).+$/;

    lines.forEach(function (line) {
      var trimmed = line.trim();

      if (!trimmed) {
        kept.push(line);
        return;
      }

      if (/^(timestamps?|chapters?)\s*:?$/i.test(trimmed)) return;
      if (chapterLineRe.test(trimmed)) return;

      kept.push(line);
    });

    return kept.join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Sort chapters and remove duplicates.
  function uniqueChapters(chapters) {
    var seen = {};
    var out = [];

    chapters.sort(function (a, b) {
      return a.start - b.start;
    });

    chapters.forEach(function (c) {
      if (!c || !isFinite(c.start) || c.start < 0) return;

      var key = Math.round(c.start) + ':' + compactTitle(c.title).toLowerCase();

      if (seen[key]) return;

      seen[key] = true;
      out.push(c);
    });

    return out;
  }

  // Try to find chapter timestamps inside the video description.
  function parseChaptersFromDescription(description, duration) {
    if (!description) return [];

    var lines = String(description).split(/\r?\n/);
    var chapters = [];

    var timeRe = /^\s*(?:[-*•]|\d+[.)])?\s*(?:\[|\()?((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\]|\))?\s*(?:[-–—:|]\s*)?(.+?)\s*$/;

    lines.forEach(function (line) {
      var m = line.match(timeRe);

      if (!m) return;

      var start = parseTimeToSeconds(m[1]);
      var title = compactTitle(m[2]);

      if (!title || /^https?:\/\//i.test(title) || /^timestamps?$/i.test(title)) return;

      chapters.push({
        start: start,
        title: title,
        source: 'description'
      });
    });

    chapters = uniqueChapters(chapters);

    chapters.forEach(function (c, i) {
      var next = chapters[i + 1];

      if (next && next.start > c.start) {
        c.end = next.start;
      } else if (duration && isFinite(duration) && duration > c.start) {
        c.end = duration;
      }
    });

    return chapters;
  }

  // Use Piped's chapters if available.
  // If not, try to find chapters inside the description text.
  function normaliseChapters(data) {
    var duration = Number(data && data.duration) || 0;
    var raw = Array.isArray(data && data.chapters) ? data.chapters : [];

    var chapters = raw.map(function (c) {
      if (!c) return null;

      var start = c.start;

      if (start == null) start = c.startTime;
      if (start == null) start = c.startSeconds;
      if (start == null) start = c.from;
      if (start == null) start = c.timestamp;

      var end = c.end;

      if (end == null) end = c.endTime;
      if (end == null) end = c.endSeconds;
      if (end == null) end = c.to;

      return {
        start: parseTimeToSeconds(start),
        end: end == null ? null : parseTimeToSeconds(end),
        title: compactTitle(c.title || c.name || c.chapter || c.label || 'Chapter'),
        image: c.image || c.thumbnail || c.thumbnailUrl || ''
      };
    }).filter(Boolean);

    if (!chapters.length) {
      chapters = parseChaptersFromDescription(
        normaliseDescriptionText(data && data.description),
        duration
      );
    }

    chapters = uniqueChapters(chapters);

    chapters.forEach(function (c, i) {
      if (!c.end || c.end <= c.start) {
        var next = chapters[i + 1];

        if (next && next.start > c.start) {
          c.end = next.start;
        } else if (duration && isFinite(duration) && duration > c.start) {
          c.end = duration;
        }
      }
    });

    return chapters;
  }

  // Jump the YouTube player to a chapter/timestamp.
  function seekTo(seconds) {
    seconds = Math.max(0, Number(seconds) || 0);

    if (currentPlayer && currentPlayer.seekTo) {
      try {
        currentPlayer.seekTo(seconds, true);

        if (currentPlayer.playVideo) {
          currentPlayer.playVideo();
        }

        return;
      } catch (_) {}
    }

    // Fallback if the player API is not ready.
    if (currentVideoId) {
      var parsed = {
        videoId: currentVideoId,
        startSeconds: Math.round(seconds)
      };

      var path = P.buildWatchPath(parsed);

      if (path) {
        window.location.assign(path);
      }
    }
  }

  // Simple URL check.
  function isProbablyUrl(s) {
    return /^(https?:\/\/|www\.)/i.test(String(s || ''));
  }

  // Remove punctuation that often gets stuck to URLs in descriptions.
  function cleanupUrl(raw) {
    var url = String(raw || '');
    var suffix = '';

    while (/[),.!?;:]$/.test(url)) {
      suffix = url.slice(-1) + suffix;
      url = url.slice(0, -1);
    }

    return {
      url: url,
      suffix: suffix
    };
  }

  // Convert YouTube URLs in descriptions into Purify watch links.
  function purifyLinkForUrl(rawUrl) {
    var candidate = rawUrl;

    if (/^www\./i.test(candidate)) {
      candidate = 'https://' + candidate;
    }

    try {
      var parsed = P.parseInput(candidate);

      if (parsed && (parsed.videoId || parsed.playlistId)) {
        return P.buildWatchPath(parsed);
      }
    } catch (_) {}

    return null;
  }

  // Escape normal text and turn timestamps into clickable buttons.
  function escapeAndTimestampText(text) {
    var raw = String(text == null ? '' : text);
    var re = /(^|[\s(\[>])((?:\d{1,2}:)?\d{1,2}:\d{2})(?=$|[\s)\],.!?;:\-–—<])/g;

    var out = '';
    var last = 0;
    var m;

    while ((m = re.exec(raw))) {
      var prefix = m[1] || '';
      var time = m[2];
      var startIndex = m.index + prefix.length;

      out += P.escapeHtml(raw.slice(last, startIndex));

      var seconds = parseTimeToSeconds(time);

      out += '<button type="button" class="timestamp-link" data-seek="' +
        P.escapeHtml(String(seconds)) +
        '">' +
        P.escapeHtml(time) +
        '</button>';

      last = startIndex + time.length;
    }

    out += P.escapeHtml(raw.slice(last));

    return out;
  }

  // Convert URLs in the description into clickable links.
  function linkifyRaw(text) {
    var raw = String(text == null ? '' : text);
    var re = /(?:https?:\/\/|www\.)[^\s<>'"]+/ig;

    var out = '';
    var last = 0;
    var m;

    while ((m = re.exec(raw))) {
      out += escapeAndTimestampText(raw.slice(last, m.index));

      var cleaned = cleanupUrl(m[0]);

      var href = purifyLinkForUrl(cleaned.url) ||
        (/^www\./i.test(cleaned.url) ? 'https://' + cleaned.url : cleaned.url);

      var isPurify = href.charAt(0) === '/';

      out += '<a href="' +
        P.escapeHtml(href) +
        '"' +
        (isPurify ? '' : ' target="_blank" rel="noopener noreferrer"') +
        '>' +
        P.escapeHtml(cleaned.url) +
        '</a>';

      out += P.escapeHtml(cleaned.suffix);

      last = m.index + m[0].length;
    }

    out += escapeAndTimestampText(raw.slice(last));

    return out;
  }

  // Draw the description under the player.
  function renderDescription(description) {
    var cleanDescription = normaliseDescriptionText(description);

    if (!cleanDescription) {
      els.descWrap.hidden = true;
      els.desc.innerHTML = '';
      els.toggle.hidden = true;
      return false;
    }

    var html = cleanDescription.split(/\r?\n/).map(function (line) {
      if (!line.trim()) return '<br>';

      return '<p>' + linkifyRaw(line) + '</p>';
    }).join('');

    els.desc.innerHTML = html;
    els.desc.classList.add('video-description-collapsed');
    els.descWrap.hidden = false;
    els.toggle.textContent = 'Show more';
    els.toggle.hidden = true;

    // Wait for the browser to calculate height before deciding if we need Show more.
    setTimeout(function () {
      if (!els.desc || els.descWrap.hidden) return;

      var needsToggle = els.desc.scrollHeight > 210;

      els.toggle.hidden = !needsToggle;
    }, 0);

    return true;
  }

  // Draw the chapter buttons under the player.
  function renderChapters(chapters) {
    if (!chapters || !chapters.length) {
      els.chapterList.innerHTML = '';
      els.chapters.hidden = true;
      return false;
    }

    els.chapterList.innerHTML = chapters.map(function (c) {
      var start = Math.max(0, Number(c.start) || 0);
      var range = P.formatDuration(start);

      if (c.end && c.end > start) {
        range += ' – ' + P.formatDuration(c.end);
      }

      return '<button type="button" class="video-chapter" data-seek="' +
        P.escapeHtml(String(start)) +
        '">' +
        '<span class="video-chapter-time">' +
        P.escapeHtml(P.formatDuration(start)) +
        '</span>' +
        '<span class="video-chapter-title">' +
        P.escapeHtml(c.title || 'Chapter') +
        '</span>' +
        '<span class="video-chapter-range">' +
        P.escapeHtml(range) +
        '</span>' +
      '</button>';
    }).join('');

    els.chapters.hidden = false;

    return true;
  }

  // Draw the title, uploader, description and chapters.
  function render(data, videoId) {
    if (!ensureEls()) return;

    var description = data && data.description ? normaliseDescriptionText(data.description) : '';
    var chapters = normaliseChapters(data || {});

    if (chapters.length) {
      description = stripChapterLinesFromDescription(description, chapters);
    }

    var hasChapters = renderChapters(chapters);
    var hasDescription = renderDescription(description);

    if (!hasChapters && !hasDescription) {
      clear();
      return;
    }

    currentVideoId = videoId || currentVideoId;

    els.title.textContent = data && data.title ? data.title : 'Video description';

    var meta = [];

    if (data && data.uploader) meta.push(data.uploader);
    if (data && data.uploadDate) meta.push(data.uploadDate);
    if (data && data.duration) meta.push(P.formatDuration(data.duration));

    els.meta.textContent = meta.join(' · ');
    els.section.hidden = false;
  }

  // Build the /streams/:videoId URL for one Piped instance.
  function buildStreamsUrl(instanceBase, videoId) {
    var base = String(instanceBase || '').replace(/\/+$/, '');

    // Allow either:
    // https://example.com
    // or:
    // https://example.com/streams
    if (!/\/streams$/i.test(base)) {
      base += '/streams';
    }

    return base + '/' + encodeURIComponent(videoId);
  }

  // Check that the Piped response looks like real video data.
  function isUsableStreamResponse(data) {
    if (!data || typeof data !== 'object') return false;

    return !!(
      data.title ||
      data.description ||
      data.uploader ||
      data.duration ||
      Array.isArray(data.chapters)
    );
  }

  // Fetch video details from one Piped instance.
  function fetchFromPipedInstance(instanceBase, videoId) {
    var localController = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timedOut = false;

    controller = localController;

    var timeout = setTimeout(function () {
      timedOut = true;

      if (localController) {
        try { localController.abort(); } catch (_) {}
      }
    }, FETCH_TIMEOUT_MS);

    return fetch(buildStreamsUrl(instanceBase, videoId), {
      credentials: 'omit',
      signal: localController ? localController.signal : undefined
    }).then(function (r) {
      if (!r || !r.ok) {
        throw new Error('Piped instance failed');
      }

      return r.json();
    }).then(function (data) {
      if (!isUsableStreamResponse(data)) {
        throw new Error('Piped response did not contain video details');
      }

      return data;
    }).catch(function (err) {
      if (timedOut) {
        throw new Error('Piped instance timed out');
      }

      throw err;
    }).finally(function () {
      clearTimeout(timeout);

      if (controller === localController) {
        controller = null;
      }
    });
  }

  // Try each Piped instance one by one until one works.
  function fetchDetailsFromInstances(videoId, index) {
    index = index || 0;

    if (index >= API_BASES.length) {
      return Promise.reject(new Error('All Piped instances failed'));
    }

    return fetchFromPipedInstance(API_BASES[index], videoId).catch(function (err) {
      // If the user changed video and we cancelled the request, stop trying.
      if (err && err.name === 'AbortError') {
        throw err;
      }

      // Otherwise try the next Piped instance.
      return fetchDetailsFromInstances(videoId, index + 1);
    });
  }

  // Load description and chapters for one video.
  function load(videoId, opts) {
    opts = opts || {};

    if (opts.player) {
      currentPlayer = opts.player;
    }

    // If we do not have a valid YouTube video ID, hide the details area.
    if (!videoId || !P.VIDEO_ID_RE.test(videoId)) {
      clear();
      return;
    }

    currentVideoId = videoId;

    // Clear old description/chapters before loading new details.
    clear();

    // clear() resets the section, so set the current ID again afterwards.
    currentVideoId = videoId;

    if (!ensureEls()) return;

    fetchDetailsFromInstances(videoId, 0).then(function (data) {
      // If the user changed video while this request was running, ignore this result.
      if (currentVideoId !== videoId) return;

      render(data || {}, videoId);
    }).catch(function () {
      // If every Piped instance failed, hide the details.
      // The video itself should still keep working.
      if (currentVideoId === videoId) {
        clear();
      }
    });
  }

  // Add click handlers once.
  function wireEvents() {
    if (els.wired) return;

    els.wired = true;

    // Handle chapter and timestamp clicks.
    els.section.addEventListener('click', function (event) {
      var target = event.target && event.target.closest
        ? event.target.closest('[data-seek]')
        : null;

      if (!target) return;

      event.preventDefault();

      seekTo(parseFloat(target.getAttribute('data-seek') || '0'));
    });

    // Expand or collapse the video description.
    els.toggle.addEventListener('click', function () {
      var collapsed = els.desc.classList.toggle('video-description-collapsed');

      els.toggle.textContent = collapsed ? 'Show more' : 'Show less';
    });
  }

  // Public API used by the watch page.
  global.PurifyVideoDetails = {
    load: load,
    clear: clear,
    setPlayer: function (player) {
      currentPlayer = player || null;
    }
  };
})(window);