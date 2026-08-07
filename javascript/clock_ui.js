"use strict";

/* ============================================================
 * Clock Configuration
 * ============================================================ */

let clock_config = {
  enabled: true,

  update_interval: 1000,

  position: {
    offsetX: 12,
    offsetY: 4,
  },

  style: {
    fontSize: "18px",
    fontWeight: "600",
    fontFamily: "sans-serif",
  },

  audio: {
    enabled: true,
    masterVolume: 0.6,
    strikeVolume: 0.7,
    songVolume: 0.55,
    strikeSpacing: 4.5,
    noteDuration: 6.5,
  },

  events: {
    "00": {
      song: "hour",
      strikeHour: true,
    },

    15: {
      song: "quarter",
    },

    30: {
      song: "half",
    },

    45: {
      song: "threeQuarter",
    },
  },

  songs: {
    // Original 4-note motif
    hour: {
      notes: [
        ["A4", 0.0],
        ["E4", 1.2],
        ["D4", 2.4],
        ["A3", 3.6],
      ],
    },

    // Single bell
    quarter: {
      notes: [["A4", 0]],
    },

    // Descending pair
    half: {
      notes: [
        ["A4", 0],
        ["E4", 1.3],
      ],
    },

    // Ascending trio
    threeQuarter: {
      notes: [
        ["A3", 0],
        ["D4", 1.1],
        ["A4", 2.2],
      ],
    },
  },
};

/* ============================================================
 * Scheduler
 * ============================================================ */

let last_clock_value = null;

async function post_clock_update(clock) {
  if (clock === last_clock_value) return;

  last_clock_value = clock;

  const [hour, minute] = clock.split(":");

  const event = clock_config.events[minute];

  if (!event) return;

  if (event.song) await playSong(event.song);

  if (event.strikeHour) await strikeHour(Number(hour));
}

/* ============================================================
 * Audio
 * ============================================================ */

let audioCtx = null;

const NOTES = {
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
};

async function ensureAudio() {
  if (!audioCtx) audioCtx = new AudioContext();

  if (audioCtx.state === "suspended") await audioCtx.resume();
}

/* ============================================================
 * Bell Synth
 * ============================================================ */

function bell(
  frequency,
  startTime,
  duration = clock_config.audio.noteDuration,
  volume = 1,
) {
  const partials = [
    { mult: 1.0, gain: 1.0 },
    { mult: 2.01, gain: 0.55 },
    { mult: 2.76, gain: 0.4 },
    { mult: 4.08, gain: 0.22 },
    { mult: 5.43, gain: 0.15 },
    { mult: 6.8, gain: 0.09 },
  ];

  for (const partial of partials) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.value = frequency * partial.mult;

    const g = partial.gain * clock_config.audio.masterVolume * volume;

    gain.gain.setValueAtTime(0.0001, startTime);

    gain.gain.exponentialRampToValueAtTime(g, startTime + 0.01);

    gain.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

/* ============================================================
 * Song Player
 * ============================================================ */
const player_switch = [true, false];
async function playSong(songName) {
  //console.log("playSong clock", songName, !clock_config.audio.enabled, player_switch[buttonmutemode]);
  if (!clock_config.audio.enabled) return;
  if (player_switch[buttonmutemode]) return;

  const song = clock_config.songs[songName];

  if (!song) {
    console.warn("Unknown clock song:", songName);
    return;
  }

  await ensureAudio();

  const now = audioCtx.currentTime;

  for (const [note, delay] of song.notes) {
    const freq = NOTES[note];

    if (!freq) continue;

    bell(
      freq,
      now + delay,
      clock_config.audio.noteDuration,
      clock_config.audio.songVolume,
    );
  }
}

/* ============================================================
 * Hour Strike
 * ============================================================ */

async function strikeHour(hour24) {
  if (!clock_config.audio.enabled) return;
  if (player_switch[buttonmutemode]) return;

  await ensureAudio();

  let strikes = hour24 % 12;

  if (strikes === 0) strikes = 12;

  const start = audioCtx.currentTime + 5.5;

  for (let i = 0; i < strikes; i++) {
    bell(
      NOTES.A3,
      start + i * clock_config.audio.strikeSpacing,
      clock_config.audio.noteDuration,
      clock_config.audio.strikeVolume,
    );
  }
}

/* ============================================================
 * Clock UI
 * ============================================================ */

(() => {
  const CLOCK_ID = "injected-live-clock";

  function getMenuBtn() {
    return document.getElementById("top-menu-btn");
  }

  function formatTime() {
    const d = new Date();

    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function ensureClock() {
    let clock = document.getElementById(CLOCK_ID);

    if (clock) return clock;

    clock = document.createElement("div");
    clock.id = CLOCK_ID;

    Object.assign(clock.style, {
      position: "fixed",
      zIndex: "1900",
      pointerEvents: "none",
      whiteSpace: "nowrap",

      fontSize: clock_config.style.fontSize,
      fontWeight: clock_config.style.fontWeight,
      fontFamily: clock_config.style.fontFamily,
    });

    document.body.appendChild(clock);

    return clock;
  }

  function positionClock(clock, menu) {
    const rect = menu.getBoundingClientRect();

    clock.style.color = getComputedStyle(menu).color;

    clock.style.top = `${
      rect.top +
      (rect.height - clock.offsetHeight) / 2 +
      clock_config.position.offsetY
    }px`;

    clock.style.left = `${
      rect.left - clock.offsetWidth - clock_config.position.offsetX
    }px`;
  }

  function update() {
    if (!clock_config.enabled) return;

    const clock = ensureClock();

    const time = formatTime();

    if (clock.textContent !== time) {
      clock.textContent = time;
      post_clock_update(time);
    }

    const menu = getMenuBtn();

    if (menu) positionClock(clock, menu);
  }

  /* ========================================================
   * Init
   * ======================================================== */

  update();

  setInterval(update, clock_config.update_interval);

  /* ========================================================
   * Observe menu style changes
   * ======================================================== */

  const styleObserver = new MutationObserver(update);

  function observeMenu() {
    const menu = getMenuBtn();

    if (!menu) return;

    if (menu.__clockObserverInstalled) return;

    styleObserver.observe(menu, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    menu.__clockObserverInstalled = true;
  }

  observeMenu();

  /* ========================================================
   * SPA support
   * ======================================================== */

  new MutationObserver(() => {
    observeMenu();
    update();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
