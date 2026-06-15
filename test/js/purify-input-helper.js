(function () {
  'use strict';

  /*
    Purify input helper.

    What this file does:
    - Detects when a YouTube URL is pasted into the Purify input.
    - Immediately sends the user to the clean watch page.
    - Supports normal video URLs, playlist URLs, Shorts URLs, and youtu.be URLs.
    - Supports /channel/UC... URLs by turning the channel ID into an uploads playlist.
    - Supports @handle URLs if you add the small PHP resolver endpoint below.
  */

  var INPUT_SELECTOR = '#urlInput, #search-all';
  var FORM_ID = 'purifyForm';

  // Optional server endpoint for resolving @handles to channel IDs.
  // Add the PHP file below if you want @handle support.
  var CHANNEL_RESOLVER_URL = '/resolve-youtube-channel.php';

  var CHANNEL_ID_RE = /^UC[a-zA-Z0-9_-]{22}$/;
  var UPLOADS_PLAYLIST_RE = /^UU[a-zA-Z0-9_-]{22}$/;

  function getInputFromEventTarget(target) {
    if (!target || !target.matches) return null;
    if (target.matches(INPUT_SELECTOR)) return target;
    return null;
  }

  function getMainInput() {
    return document.querySelector(INPUT_SELECTOR);
  }

  function getForm(input) {
    if (input && input.form) return input.form;
    return document.getElementById(FORM_ID);
  }

  function getPastedText(event) {
    var text = '';

    try {
      text = (event.clipboardData || window.clipboardData).getData('text');
    } catch (_) {}

    return String(text || '').trim();
  }

  function looksLikeYoutubeInput(text) {
    if (!text) return false;

    return (
      text.indexOf('http://') !== -1 ||
      text.indexOf('https://') !== -1 ||
      text.indexOf('youtube.com/') !== -1 ||
      text.indexOf('youtu.be/') !== -1 ||
      text.indexOf('www.youtube.com/') !== -1 ||
      text.indexOf('m.youtube.com/') !== -1 ||
      CHANNEL_ID_RE.test(text)
    );
  }

  function setAutoplayIntent() {
    try {
      sessionStorage.setItem('purify.autoplayIntent', '1');
      sessionStorage.setItem('purify.autoplayAt', String(Date.now()));
    } catch (_) {}
  }

  function blurInput(input) {
    try {
      input.blur();
    } catch (_) {}
  }

  function showMessage(message) {
    var errorEl = document.getElementById('purifyError');

    if (!errorEl) {
      alert(message);
      return;
    }

    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearMessage() {
    var errorEl = document.getElementById('purifyError');

    if (!errorEl) return;

    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  function channelIdToUploadsPlaylist(channelId) {
    // YouTube channel IDs usually start with UC.
    // The channel uploads playlist usually starts with UU.
    return 'UU' + channelId.slice(2);
  }

  function goToUploadsPlaylist(playlistId) {
    if (!UPLOADS_PLAYLIST_RE.test(playlistId)) {
      showMessage('Could not create an uploads playlist from that channel.');
      return;
    }

    setAutoplayIntent();

    window.location.assign('/watch?list=' + encodeURIComponent(playlistId));
  }

  function parseYoutubeChannelInput(raw) {
    raw = String(raw || '').trim();

    if (!raw) return null;

    // Allow someone to paste only the raw channel ID.
    if (CHANNEL_ID_RE.test(raw)) {
      return {
        type: 'channelId',
        channelId: raw
      };
    }

    // Allow someone to paste only an uploads playlist ID.
    if (UPLOADS_PLAYLIST_RE.test(raw)) {
      return {
        type: 'uploadsPlaylist',
        playlistId: raw
      };
    }

    var url;

    try {
      // Let users paste youtube.com/... without https://
      if (!/^https?:\/\//i.test(raw)) {
        raw = 'https://' + raw;
      }

      url = new URL(raw);
    } catch (_) {
      return null;
    }

    var host = url.hostname.toLowerCase();
    host = host.replace(/^www\./, '').replace(/^m\./, '');

    if (host !== 'youtube.com') return null;

    // Already an uploads playlist URL.
    if (url.pathname === '/playlist') {
      var listId = url.searchParams.get('list') || '';

      if (UPLOADS_PLAYLIST_RE.test(listId)) {
        return {
          type: 'uploadsPlaylist',
          playlistId: listId
        };
      }

      return null;
    }

    var parts = url.pathname.split('/').filter(Boolean);

    // Example: youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx
    if (parts[0] === 'channel' && CHANNEL_ID_RE.test(parts[1] || '')) {
      return {
        type: 'channelId',
        channelId: parts[1]
      };
    }

    // Example: youtube.com/@GoogleDevelopers
    if (parts[0] && parts[0].charAt(0) === '@') {
      return {
        type: 'channelRef',
        channelRef: parts[0]
      };
    }

    // Older custom channel formats.
    // Example: youtube.com/c/SomeName
    // Example: youtube.com/user/SomeName
    if ((parts[0] === 'c' || parts[0] === 'user') && parts[1]) {
      return {
        type: 'channelRef',
        channelRef: parts[0] + '/' + parts[1]
      };
    }

    return null;
  }

  function resolveChannelRef(channelRef) {
    var url = CHANNEL_RESOLVER_URL + '?channel=' + encodeURIComponent(channelRef);

    return fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store'
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Resolver returned HTTP ' + response.status);
        }

        return response.json();
      })
      .then(function (data) {
        if (!data || !data.channelId || !CHANNEL_ID_RE.test(data.channelId)) {
          throw new Error('Resolver did not return a valid channel ID');
        }

        return data;
      });
  }

  function handleChannelInput(channelInfo, input) {
    if (!channelInfo) return false;

    clearMessage();

    if (channelInfo.type === 'uploadsPlaylist') {
      blurInput(input);
      goToUploadsPlaylist(channelInfo.playlistId);
      return true;
    }

    if (channelInfo.type === 'channelId') {
      blurInput(input);
      goToUploadsPlaylist(channelIdToUploadsPlaylist(channelInfo.channelId));
      return true;
    }

    if (channelInfo.type === 'channelRef') {
      showMessage('Looking up that YouTube channel...');

      resolveChannelRef(channelInfo.channelRef)
        .then(function (data) {
          blurInput(input);

          if (data.uploadsPlaylistId && UPLOADS_PLAYLIST_RE.test(data.uploadsPlaylistId)) {
            goToUploadsPlaylist(data.uploadsPlaylistId);
            return;
          }

          goToUploadsPlaylist(channelIdToUploadsPlaylist(data.channelId));
        })
        .catch(function () {
          showMessage('Could not read that channel. Try pasting a video URL or a /channel/UC... URL instead.');
        });

      return true;
    }

    return false;
  }

  function handleNormalYoutubeInput(raw, input) {
    var P = window.Purify;

    // Reuse your existing parser where possible.
    if (P && P.parseInput && P.buildWatchPath) {
      var parsed = P.parseInput(raw);
      var path = parsed ? P.buildWatchPath(parsed) : '';

      if (path) {
        setAutoplayIntent();
        blurInput(input);
        window.location.assign(path);
        return true;
      }
    }

    // Fallback: let your existing form handler deal with it.
    var form = getForm(input);

    if (form && form.requestSubmit) {
      form.requestSubmit();
      return true;
    }

    if (form) {
      form.submit();
      return true;
    }

    return false;
  }

  function handleInputValue(raw, input) {
    if (!raw) return false;

    var channelInfo = parseYoutubeChannelInput(raw);

    if (channelInfo) {
      return handleChannelInput(channelInfo, input);
    }

    return handleNormalYoutubeInput(raw, input);
  }

  // Detect pasted URLs and immediately run the Purify flow.
  document.addEventListener('paste', function (event) {
    var input = getInputFromEventTarget(event.target);

    if (!input) return;

    var pasted = getPastedText(event);

    if (!looksLikeYoutubeInput(pasted)) return;

    // Browser has not put the pasted text into the input yet, so we do it ourselves.
    event.preventDefault();

    input.value = pasted;

    clearMessage();

    handleInputValue(pasted, input);
  });

  // Also support typing a channel URL and clicking the Purify button.
  // Normal video URLs are still handled by your existing code.
  document.addEventListener('submit', function (event) {
    var form = event.target;

    if (!form || form.id !== FORM_ID) return;

    var input = getMainInput();

    if (!input) return;

    var raw = String(input.value || '').trim();
    var channelInfo = parseYoutubeChannelInput(raw);

    if (!channelInfo) return;

    // Stop the existing form handler only for channel URLs.
    event.preventDefault();
    event.stopImmediatePropagation();

    handleChannelInput(channelInfo, input);
  }, true);

})();