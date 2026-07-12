(() => {
  let useSecureClock = false;
  let serverTimestamp = 0;
  let syncPerf = 0;
  let timezone = "UTC";
  let sha = "";

  const scripts = [
    "javascript/jszip.min.js",
    "javascript/defines.js",
    "javascript/cards.js",
    "javascript/custom_cards.js",
    "javascript/decks.js",
    "javascript/abilities.js",
    "javascript/factions.js",
    "javascript/hls.js@1.js",
    "javascript/gwent_coin.js",
    "javascript/gwent.js",
    "https://www.youtube.com/iframe_api",
    "javascript/session_registering.js",
    "javascript/patchnotes.js",
    "javascript/sync_hands.js",
    "javascript/session.js",
    "javascript/chat.js",
    "javascript/faction_ability_counter.js",
    "javascript/connect_to_custom_server.js",
  ];

  window.Clock = {
    now() {
      if (!useSecureClock) return Date.now();

      return serverTimestamp + (performance.now() - syncPerf);
    },

    date() {
      return new Date(this.now());
    },
  };

  async function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");

      s.src = `${src}?ver=${encodeURIComponent(sha)}`;

      s.onload = resolve;

      s.onerror = reject;

      document.head.appendChild(s);
    });
  }

  async function loadScripts() {
    for (const script of scripts) {
      console.log("Loading", script);

      await loadScript(script);
    }
  }

  async function syncClock() {
    try {
      const config = await fetch(
        `javascript/clock_config.json?date=${random_string_gen()}`,
        {
          cache: "no-store",
        },
      );

      const json = await config.json();

      timezone = json.zone || "UTC";
      sha = json.sha || "";

      console.log("Clock config", json);

      const start = performance.now();

      const response = await fetch(
        `https://time.now/developer/api/timezone/${encodeURIComponent(timezone)}`,
        {
          cache: "no-store",
        },
      );

      const midpoint = performance.now();

      const body = await response.json();

      serverTimestamp = new Date(body.datetime).getTime();

      syncPerf = (start + midpoint) / 2;

      useSecureClock = true;

      console.log(
        "Secure clock synced",
        new Date(serverTimestamp).toISOString(),
      );
    } catch (e) {
      console.warn("Secure clock unavailable, using device clock.", e);

      useSecureClock = false;
    }

    await loadScripts();
    await postscripinit();
  }

  syncClock();
})();
