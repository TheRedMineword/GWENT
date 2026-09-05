let IsNowCustom = false;
// ===============================
// CONFIG
// ===============================
const IGNORE_PATTERNS = [
  "reinit_after",
  "openBoxEntry",
  "boxCountdownInterval",
  "DECK_POOL",
  "deckTickInterval",
  "INDEX_CACHE",
  "watcherTimer",
  "SHOW_BELL_BUTTON",
  "gameInProgress",
  "it_is_me_an_doppler",
  "discord_cards",
  "discord_cards_array",
  "resync_contnet",
  "resync_now_apply",
  "knowissuescript",
  "youtubeInitializing",
  "STRNG_base",
  "videoMapLyrics",
  "activeBars",
  "_debug_volume",
  "expireTimer",
  "active_messages",
  "menubntconfig.*",
  "the_image_json",
  "medicrevivethat",
  "onYouTubeIframeAPIReady_status",
  "custom_updater",
  "*.factionAbility",
  "*.placed",
  "*.removed",
  "*.activated",
  "api_url_msg",
  "players.me",
  "players.op",
  "current_op.*",
  "ongame_start_eval",
  "wsUrl",
  "socket",
  "STORAGE_KEY",
  "STORAGE_KEY_B",
  "patchnotesWatcher",
  "IGNORE_PATTERNS",
  "cachedWaitMusicBlobUrl",
  "waitMusicPlaying",
  "gameID",
  "maxhealth",
  "*.noflag",
  "twoPlayersConnected",
  "extraJSON",
  "gameended",
  "displaynow",
  "LOG_PREFIX",
  "IsNowCustom",
  "witcher_signs",
  "ThisDef",
  "isconnectedtosession",
  "texturepack",
  "playblock",
  "currentPlayerId",
  "previous_game_start_cards",
  "med_draw",
  "add_redraws",
  "AUDIO_STATE",
  "white_flame_lg_faction",
  "pick_array",
  "resolveScorch",
  "yt_repeat_conf",
  "yt_repeat_launch",
  "sm_custom_cards_map",
  "lg_custom_cards_map",
  "custom_blob_urls",
  "init_done",
  "loadedFonts",
  "useSecureClock",
  "serverTimestamp",
  "syncPerf",
  "sha",
  "timezone",
  "timed_count_change",
  "ABILITIES",
];
const LOG_PREFIX = "[CUSTOM_SERVER]";

// ===============================
// LOGGING
// ===============================

// Using direct console logs instead of wrapper functions

// ===============================
// OVERLAY UI
// ===============================

let loaderOverlay = null;
let loaderStatus = null;
let loaderProgress = null;
let loaderExtra = null;
function customSwitch() {
  if (IsNowCustom) {
    IsNowCustom = false;
  } else {
    IsNowCustom = true;
  }
}
async function reset_custom() {
  console.log("CUSTOM POWER DOWN", IsNowCustom);

  if (!IsNowCustom) {
    return;
  }

  IsNowCustom = false;

  var def = ThisDef;

  def.env_vars.STRNG = STRNG_base;
  def.env_vars.card_dict = card_dict_base;
  def.env_vars.factions = factions_base;
  def.env_vars.ability_dict = ability_dict_base;

  def.texture_pack_url = null;

  def.env_vars.audio_yt_vid_soundtrack = ArrayPickObjectForDay(
    pick_array.game,
  ).id;

  def.env_vars.audio_yt_vid_soundtrack_volume = ArrayPickObjectForDay(
    pick_array.game,
  ).vol;

  def.env_vars.tavern_yt_vid = ArrayPickObjectForDay(pick_array.lobby).id;

  def.env_vars.tavern_yt_volume = ArrayPickObjectForDay(pick_array.lobby).vol;

  resetTexturePack();

  console.log("CUSTOM POWERING DOWN DEF", def);

  const json = JSON.stringify(def);
  const bytes = new TextEncoder().encode(json);

  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  const base64 = btoa(binary);

  await connect_to_custom_server(`data:application/json;base64,${base64}`);

  await sleep(300);

  IsNowCustom = false;
}
function createLoaderOverlay() {
  if (loaderOverlay) return;

  openFullscreen();

  loaderOverlay = document.createElement("div");
  loaderOverlay.id = "custom-server-loader";

  loaderOverlay.style.position = "fixed";
  loaderOverlay.style.top = "0";
  loaderOverlay.style.left = "0";
  loaderOverlay.style.width = "100vw";
  loaderOverlay.style.height = "100vh";
  loaderOverlay.style.zIndex = "999999";
  loaderOverlay.style.background = "#2B2B17";
  loaderOverlay.style.display = "flex";
  loaderOverlay.style.alignItems = "center";
  loaderOverlay.style.justifyContent = "center";
  loaderOverlay.style.flexDirection = "column";
  loaderOverlay.style.fontFamily = "Arial, sans-serif";
  loaderOverlay.style.color = "#CF8E09";
  loaderOverlay.style.userSelect = "none";
  loaderOverlay.style.pointerEvents = "all";

  const title = document.createElement("div");
  title.innerText = "CONNECTING TO CUSTOM SERVER";
  title.style.fontSize = "32px";
  title.style.fontWeight = "bold";
  title.style.marginBottom = "24px";

  loaderStatus = document.createElement("div");
  loaderStatus.innerText = "Initializing...";
  loaderStatus.style.fontSize = "18px";
  loaderStatus.style.marginBottom = "20px";

  const progressContainer = document.createElement("div");
  progressContainer.style.width = "420px";
  progressContainer.style.height = "24px";
  progressContainer.style.background = "#111";
  progressContainer.style.border = "2px solid #205219";
  progressContainer.style.borderRadius = "8px";
  progressContainer.style.overflow = "hidden";

  loaderProgress = document.createElement("div");
  loaderProgress.style.width = "0%";
  loaderProgress.style.height = "100%";
  loaderProgress.style.background = "#205219";
  loaderProgress.style.transition = "width 0.15s linear";

  progressContainer.appendChild(loaderProgress);

  loaderExtra = document.createElement("div");
  loaderExtra.style.marginTop = "24px";
  loaderExtra.style.fontSize = "14px";
  loaderExtra.style.opacity = "0.9";
  loaderExtra.innerText = "Waiting for server...";

  loaderOverlay.appendChild(title);
  loaderOverlay.appendChild(loaderStatus);
  loaderOverlay.appendChild(progressContainer);
  loaderOverlay.appendChild(loaderExtra);

  document.body.appendChild(loaderOverlay);

  console.log(LOG_PREFIX, "Loader overlay created");
}

function updateLoader(status, percent = null, extra = null) {
  if (loaderStatus && status) {
    loaderStatus.innerText = status;
  }

  if (loaderProgress && percent !== null) {
    loaderProgress.style.width = `${percent}%`;
  }

  if (loaderExtra && extra !== null) {
    loaderExtra.innerText = extra;
  }

  console.log(LOG_PREFIX, "Loader update:", {
    status,
    percent,
    extra,
  });
}

function removeLoaderOverlay() {
  if (!loaderOverlay) return;

  loaderOverlay.remove();
  loaderOverlay = null;

  console.log(LOG_PREFIX, "Loader overlay removed");
}

async function showThirdPartyWarning(url) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "tp-overlay";

    const modal = document.createElement("div");
    modal.className = "tp-modal";

    const title = document.createElement("h3");
    title.textContent = "⚠ Third-party Texture Pack";

    const description = document.createElement("p");
    description.textContent = "You are about to load a texture pack from:";

    const urlContainer = document.createElement("p");
    const urlText = document.createElement("b");

    // URL is untrusted: textContent prevents HTML/script interpretation.
    const displayUrl =
      typeof url === "string"
        ? url.length > 75
          ? `${url.slice(0, 75)}....`
          : url
        : "";

    urlText.textContent = displayUrl;
    urlContainer.appendChild(urlText);

    const warning = document.createElement("p");
    warning.textContent = "We are not responsible for its content or safety.";

    const accept = document.createElement("button");
    accept.className = "tp-accept";
    accept.textContent = "Accept";

    const cancel = document.createElement("button");
    cancel.className = "tp-cancel";
    cancel.textContent = "Cancel";

    modal.append(title, description, urlContainer, warning, accept, cancel);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const cleanup = () => overlay.remove();

    cancel.onclick = () => {
      cleanup();
      resolve(false);
    };

    accept.onclick = async () => {
      cleanup();

      try {
        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const blob = await res.blob();
        const zip = await JSZip.loadAsync(blob);

        if (!zip.file("data.meta")) {
          throw new Error("Missing data.meta");
        }

        const metaText = await zip.file("data.meta").async("string");

        const files = {};
        let hasAssets = false;

        zip.forEach((path, file) => {
          if (path.startsWith("assets/") && !file.dir) {
            hasAssets = true;
            files[path] = file.async("blob");
          }
        });

        if (!hasAssets) {
          throw new Error("Missing assets/ folder");
        }

        const resolvedAssets = {};
        for (const key in files) {
          resolvedAssets[key] = await files[key];
        }

        texturePack = {
          sourceUrl: url,
          meta: metaText,
          assets: resolvedAssets,
          path: blob,
        };

        refreshFactionVisuals();
        refreshAllCards();
        resolve(true);
      } catch (err) {
        console.error(err);
        alert("Failed to load texture pack: " + err.message);
        resolve(false);
      }
    };
  });
}

function resetTexturePack() {
  if (!texturePack) return;

  // revoke blob if needed (optional but good practice)
  if (texturePack.path instanceof Blob) {
    URL.revokeObjectURL(texturePack.path);
  }
  texturePackBlobCache.clear();
  texturePack = null;
  refreshFactionVisuals();
  refreshAllCards();
}

// ===============================
// IGNORE PATTERN MATCHING
// ===============================

const IGNORE_REGEXES = IGNORE_PATTERNS.map(
  (pattern) =>
    new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"),
);

function shouldIgnore(path) {
  for (const regex of IGNORE_REGEXES) {
    if (regex.test(path)) {
      return true;
    }
  }

  return false;
}

// ===============================
// APPLY ENV VARS TO WINDOW
// ===============================

function applyEnvVars(envVars, currentPath = "") {
  if (!envVars || typeof envVars !== "object") {
    console.warn(LOG_PREFIX, "Invalid env vars object");
    return;
  }

  for (const key in envVars) {
    const value = envVars[key];

    const path = currentPath ? `${currentPath}.${key}` : key;

    if (shouldIgnore(path)) {
      console.warn(LOG_PREFIX, "Ignored env var path:", path);
      continue;
    }

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      applyEnvVars(value, path);
      continue;
    }

    setGlobalValue(path, value);
  }
}
function isValidPath(path) {
  if (typeof path !== "string") return false;

  path = path.trim();

  if (!path) return false;
  if (path.startsWith(".") || path.endsWith(".")) return false;
  if (path.includes("..")) return false;

  return path.split(".").every((part) => part.length > 0);
}
const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function getGlobalRef(name) {
  try {
    return (0, eval)(name);
  } catch (e) {
    // Not declared anywhere yet (or a ReferenceError in strict mode) —
    // caller treats this the same as "doesn't exist".
    return undefined;
  }
}

function setTopLevelGlobal(name, value) {
  try {
    globalThis.__envVarTmp__ = value;
    (0, eval)(`${name} = globalThis.__envVarTmp__;`);
  } catch (e) {
    console.warn(
      LOG_PREFIX,
      `eval-assign failed for "${name}", falling back to property set:`,
      e,
    );
    globalThis[name] = value;
  } finally {
    delete globalThis.__envVarTmp__;
  }
}

function setGlobalValue(path, value) {
  if (!isValidPath(path)) {
    console.warn("Invalid path:", path);
    return;
  }

  const parts = path.split(".");

  if (!parts.every((part) => IDENTIFIER_RE.test(part))) {
    console.warn(LOG_PREFIX, "Rejected unsafe path segment(s):", path);
    return;
  }

  if (parts.length === 1) {
    setTopLevelGlobal(parts[0], value);
    console.log(LOG_PREFIX, `Set global value: ${path}`, value);
    return;
  }

  let target = getGlobalRef(parts[0]);

  if (typeof target !== "object" || target === null) {
    target = {};
    setTopLevelGlobal(parts[0], target);
  }

  for (let i = 1; i < parts.length - 1; i++) {
    const part = parts[i];

    if (typeof target[part] !== "object" || target[part] === null) {
      target[part] = {};
    }

    target = target[part];
  }

  const lastKey = parts[parts.length - 1];

  target[lastKey] = value;

  console.log(LOG_PREFIX, `Set global value: ${path}`, value);
}

// ===============================
// MAIN CONNECTION FUNCTION
// ===============================

async function connect_to_custom_server(URL) {
  console.log(`connect_to_custom_server INIT`, URL);
  customSwitch();
  createLoaderOverlay();

  try {
    tocar("tf2/Carrier_new_robot", false);
    updateLoader(
      "Connecting...",
      0,
      `Request Hashed: ${btoa(for_seed_hashString(URL))}`,
    );
    await sleep(1500);
    console.log(LOG_PREFIX, "Connecting to URL:", URL);

    // ===========================
    // GET HEADERS FIRST
    // ===========================

    const headResponse = await fetch(URL, {
      method: "HEAD",
    });

    let contentLength = headResponse.headers.get("c-l");
    contentLength = contentLength || headResponse.headers.get("content-length");

    console.log(LOG_PREFIX, "HEADERS:", [...headResponse.headers.entries()]);

    updateLoader(
      "Synchronization with the Server",
      5,
      `Downloading ${contentLength || `?`} bytes`,
    );
    // ===========================
    // DOWNLOAD RESPONSE STREAM
    // ===========================

    const response = await fetch(URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const total = Number(
      response.headers.get("c-l") ||
        response.headers.get("content-length") ||
        contentLength ||
        0,
    );

    const reader = response.body.getReader();

    let received = 0;
    let chunks = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      chunks.push(value);
      received += value.length;

      let percent = 5;
      let rawPercent = 0;

      if (total > 0 && Number.isFinite(total)) {
        rawPercent = Math.min(100, Math.floor((received / total) * 100));

        // map 0-100 -> 60-63
        percent = 5 + (rawPercent / 100) * (63 - 5);
      }

      updateLoader(
        "Downloading server data...",
        percent,
        `${received} / ${total || "?"} bytes`,
      );
    }

    // ===========================
    // COMBINE RESPONSE
    // ===========================

    const merged = new Uint8Array(received);

    let position = 0;

    for (const chunk of chunks) {
      merged.set(chunk, position);
      position += chunk.length;
    }

    const text = new TextDecoder().decode(merged);

    console.log(LOG_PREFIX, "Downloaded response text length:", text.length);
    await sleep(600);
    updateLoader("Parsing response...", 64);

    // ===========================
    // PARSE JSON RESPONSE
    // ===========================

    let data = null;

    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error(LOG_PREFIX, "Invalid JSON response", err);
      throw err;
    }

    console.log(LOG_PREFIX, "Server response:", data);
    if (data?.name) {
      var s_name = data?.name;
      var s_name_low = data?.name;
    } else {
      var s_name = "Server";
      var s_name_low = "server";
    }
    card_dict = await deepClone(card_dict_base);
    if (data.env_vars?.card_dict) {
      card_dict = data.env_vars?.card_dict;
      console.log(LOG_PREFIX, data.env_vars?.card_dict, `NEW CARDS`);
    }
    if (data.env_vars?.thishandsize) {
      thishandsize = data.env_vars?.thishandsize || thishandsize;
    }
    // ===========================
    // APPLY ENV VARS
    // ===========================
    updateLoader("Parsing bit more...", 68);
    if (
      typeof data?.texture_pack_url === "string" &&
      data.texture_pack_url.trim() !== ""
    ) {
      updateLoader("Loading texture pack", 70);
      await showThirdPartyWarning(data.texture_pack_url);
    }
    if (data.env_vars) {
      updateLoader(
        "Applying env vars...",
        80,
        `You are synchronizing with ${s_name_low}`,
      );

      applyEnvVars(data.env_vars);
    }
    premade_deck = await async_gen_premade_decks();
    console.log("NEW PREMADE DECK", premade_deck);
    await sleep(300);
    updateLoader(
      "Almost There",
      85,
      `Finalizing the connection with ${s_name_low}`,
    );
    updateLoader(
      "Building cards!",
      88,
      `Finalizing the connection with ${s_name_low}`,
    );
    custom_updater = true;
    await sleep(300);
    await custom_card_builder_init();
    await setDiscordCards(allowdiscordintegration, discord_cards_array);
    custom_updater = false;
    var tmp_ab = makeabilities();
    console.log(
      "CUSTOM SERVER COUNTER FACTION ABILITY: was/will be",
      `\n${JSON.stringify(ABILITIES)}\n\n${JSON.stringify(tmp_ab)}`,
    );
    ABILITIES = tmp_ab;
    //    updateLoader("Almost there", 99, `Updating cards!`);
    // timed_count_change = [];
    // card_dict.forEach((card) => {
    //    if (card.count_monitor) {
    //      pushTimedCount(card);
    //    }
    //  });
    await sleep(350);
    updateLoader("Almost there", 97, `Translating!`);
    await retranslategame(lang);
    await sleep(50);
    await rerunDailyCardPickSafe();
    updateLoader("Almost there", 98, `Reloading UI!`);
    await reloadRuntimeConfigs();
    if (!waitMusicPlaying) {
      ui.youtubePlay(tavern_yt_vid, tavern_yt_volume, true);
    }
    await sleep(1500);
    updateLoader("Done", 100, `${s_name} Fully Loaded`);
    try {
      comp_and_send(
        socket,
        JSON.stringify({
          type: "opChangeFaction",
          faction: dm.faction,
          info: { me_id: playerId, me_flag: country },
        }),
      );
    } catch (e) {}

    console.log(LOG_PREFIX, "Custom server connection complete");

    setTimeout(() => {
      removeLoaderOverlay();
    }, 1000);

    return data;
  } catch (err) {
    console.error(LOG_PREFIX, "Connection failed:", err);

    updateLoader("Connection failed", 100, err.message);

    throw err;
  }
}

async function reloadRuntimeConfigs() {
  console.log("====================================");
  console.log("[RUNTIME RELOAD START]");
  console.log("====================================");

  try {
    // =====================================================
    // DEBUG STATE BEFORE
    // =====================================================

    console.log("[DEBUG] Existing dm:", dm);

    console.log(
      "[DEBUG] card_dict size:",
      Array.isArray(card_dict) ? card_dict.length : "INVALID",
    );

    console.log("[DEBUG] factions:", factions);

    // =====================================================
    // CLEAN OLD DECKMAKER
    // =====================================================

    if (typeof dm !== "undefined" && dm !== null) {
      console.log("[RELOAD] Cleaning old DeckMaker");

      try {
        const dynamicSelectors = [
          ".deck-row",
          ".deck-cards",
          ".deck-list",
          ".deck-builder-cards",
          ".card-list",
          ".cards-container",
        ];

        for (const selector of dynamicSelectors) {
          const containers = document.querySelectorAll(selector);

          console.log(
            `[RELOAD] selector "${selector}" found`,
            containers.length,
            "containers",
          );

          containers.forEach((container) => {
            const cards = container.querySelectorAll(".card");

            console.log(
              "[RELOAD] Removing cards from container:",
              container,
              "cards:",
              cards.length,
            );

            cards.forEach((card) => {
              console.log("[RELOAD] Removing card:", card);

              card.remove();
            });
          });
        }
      } catch (cleanupErr) {
        console.warn("[RELOAD] Cleanup warning:", cleanupErr);
      }

      try {
        if (typeof dm.reset === "function") {
          console.log("[RELOAD] Calling dm.reset()");

          dm.reset();
        }
      } catch (resetErr) {
        console.warn("[RELOAD] dm.reset failed:", resetErr);
      }

      console.log("[RELOAD] Nulling dm");

      dm = null;
    }

    // =====================================================
    // VERIFY STATIC HTML
    // =====================================================

    console.log("[VERIFY] Checking static DeckMaker DOM");

    const staticChecks = [
      "#deck-customization",
      "#deck-builder",
      "#leader-select",
      "#leader-picker",
    ];

    staticChecks.forEach((selector) => {
      const found = document.querySelector(selector);

      console.log(`[VERIFY] ${selector}:`, found ? "FOUND" : "MISSING", found);
    });

    // =====================================================
    // REBUILD DECKMAKER
    // =====================================================

    console.log("[RELOAD] Creating new DeckMaker");

    cleanDeckMakerButtons();

    dm = new DeckMaker();

    document
      .getElementById("session-start-control")
      .addEventListener("click", () => dm.startNewGame(), false);

    console.log("[RELOAD] New DeckMaker instance:", dm);

    // =====================================================
    // INITIALIZE
    // =====================================================

    if (typeof dm.initialize === "function") {
      console.log("[RELOAD] Running dm.initialize()");

      await dm.initialize();

      console.log("[RELOAD] dm.initialize() done");
    } else {
      console.warn("[RELOAD] dm.initialize does not exist");
    }

    // =====================================================
    // REFRESH ACTIVE CARDS
    // =====================================================

    console.log("[RELOAD] Refreshing active cards");

    refreshAllCards();

    await sleep(500);
    premade_deck = await async_gen_premade_decks();
    await sleep(2000);
    console.log("[RELOAD] premade_deck", premade_deck);

    // =====================================================
    // REFRESH BOARD
    // =====================================================

    if (typeof board !== "undefined" && board) {
      console.log("[RELOAD] Refreshing board");

      board.row?.forEach((row, index) => {
        console.log("[RELOAD] Refreshing row", index, row);

        try {
          row.updateScore?.();
          row.resize?.();
        } catch (rowErr) {
          console.warn("[RELOAD] Row refresh failed:", rowErr);
        }
      });
    }

    // =====================================================
    // REFRESH HANDS
    // =====================================================

    try {
      console.log("[RELOAD] Refreshing hands");

      player_me?.hand?.resize?.();
      player_op?.hand?.resize?.();
    } catch (handErr) {
      console.warn("[RELOAD] Hand refresh failed:", handErr);
    }

    // =====================================================
    // REFRESH LEADERS
    // =====================================================

    console.log("[RELOAD] Refreshing leaders");

    refreshLeaderVisuals();

    // =====================================================
    // REFRESH FACTIONS
    // =====================================================

    // console.log("[RELOAD] Refreshing faction visuals");

    //\\refreshFactionVisuals();

    // =====================================================
    // FORCE REDRAW
    // =====================================================

    console.log("[RELOAD] Forcing redraw");

    document.body.offsetHeight;

    // =====================================================
    // DONE
    // =====================================================

    console.log("====================================");
    console.log("[RUNTIME RELOAD DONE]");
    console.log("====================================");

    showTooltip?.(getTranslation("reload.a"), 6400);
  } catch (err) {
    console.error("====================================");
    console.error("[RUNTIME RELOAD FAILED]");
    console.error("====================================");

    console.error(err);

    console.error("[STACK]");
    console.error(err.stack);

    alert("[RUNTIME RELOAD FAILED]\n\n" + err.message);
  }
}

function refreshAllCards() {
  console.log("[CARDS] Refreshing all active cards");

  const containers = [
    player_me?.hand,
    player_op?.hand,

    player_me?.deck,
    player_op?.deck,

    player_me?.grave,
    player_op?.grave,

    ...(board?.row || []),
  ];

  console.log("[CARDS] Containers count:", containers.length);

  for (const container of containers) {
    if (!container?.cards) {
      console.warn("[CARDS] Invalid container:", container);

      continue;
    }

    console.log(
      "[CARDS] Processing container:",
      container,
      "cards:",
      container.cards.length,
    );

    for (const card of container.cards) {
      try {
        console.log("[CARDS] Refreshing:", card.filename);

        const updated = card_dict.find((c) => c.filename === card.filename);

        if (!updated) {
          console.warn("[CARDS] Missing updated data for:", card.filename);

          continue;
        }

        Object.assign(card, updated);

        refreshCardVisual(card);
      } catch (cardErr) {
        console.warn("[CARDS] Failed refreshing card:", card, cardErr);
      }
    }
  }
}

function refreshCardVisual(card) {
  if (!card?.elem) {
    console.warn("[CARD VISUAL] Missing elem:", card);

    return;
  }

  try {
    console.log("[CARD VISUAL] Updating:", card.filename);

    if (card.elem.style) {
      const bg =
        typeof iconURL === "function"
          ? iconURL(card.filename)
          : `url(img/cards/${card.filename}.jpg)`;

      card.elem.style.backgroundImage = bg;
    }

    if (card.elem_power) {
      card.elem_power.innerText = card.power;
    }

    card.resize?.();
  } catch (e) {
    console.warn("[CARD VISUAL FAILED]", card, e);
  }
}

function refreshLeaderVisuals() {
  console.log("[LEADER] Refreshing leaders");

  try {
    if (player_me?.leader) {
      console.log("[LEADER] Refresh ME");

      refreshCardVisual(player_me.leader);
    }

    if (player_op?.leader) {
      console.log("[LEADER] Refresh OP");

      refreshCardVisual(player_op.leader);
    }
  } catch (e) {
    console.warn("[LEADER REFRESH FAILED]", e);
  }
}

function refreshFactionVisuals() {
  console.log("[FACTION] Refreshing visuals");

  try {
    if (player_me?.deck?.faction) {
      const faction = player_me.deck.faction;

      console.log("[FACTION] ME:", faction);

      const el = document.querySelector("#stats-me .profile-img > div > div");

      if (el) {
        el.style.backgroundImage = iconURL("deck_shield_" + faction);
      }
    }

    if (player_op?.deck?.faction) {
      const faction = player_op.deck.faction;

      console.log("[FACTION] OP:", faction);

      const el = document.querySelector("#stats-op .profile-img > div > div");

      if (el) {
        el.style.backgroundImage = iconURL("deck_shield_" + faction);
      }
    }
  } catch (e) {
    console.warn("[FACTION REFRESH FAILED]", e);
  }
}

// GLOBAL COMMAND

window.reloadRuntimeConfigs = reloadRuntimeConfigs;

function cleanDeckMakerButtons() {
  console.log("[DECKMAKER] cleaning buttons");

  const ids = [
    "card-leader",
    "change-faction",
    "download-deck",
    "add-file",
    "session-start-control",
  ];

  for (const id of ids) {
    const oldElem = document.getElementById(id);

    if (!oldElem) {
      console.warn("[DECKMAKER] missing:", id);

      continue;
    }

    const newElem = oldElem.cloneNode(true);

    oldElem.parentNode.replaceChild(newElem, oldElem);

    console.log("[DECKMAKER] cleaned:", id);
  }
}

console.log("[RUNTIME RELOAD SYSTEM LOADED]");
