//////////////////////////////////////////////////
// BOARD THEME SCRIPTS
//////////////////////////////////////////////////
window.setupTimedImages = async function (
  config,
  set_new_image,
  debug = false,
) {
  if (debug)
    console.log("[TimedImages] setupTimedImages() START", {
      config,
      set_new_image,
      timedCount: config?.timed?.length,
      moonConfig: config?.moon,
    });
  if (debug) console.log("[TimedImages] Evaluating moon script...");

  try {
    //await eval(config.moon.script);
    // await new Function(config.moon.script)();
    // console.warn(`config.moon.script === \"${config.moon.script}\"`);
    window.getMoonBoardTheme = function (
      time = Date.now(),
      lifetimeHours = 30,
    ) {
      const DAY = 86400000;
      const DEG = Math.PI / 180;

      const sinD = (x) => Math.sin(x * DEG);
      const norm = (x) => ((x % 360) + 360) % 360;

      function phaseTime(k, full) {
        const T = k / 1236.85;
        const T2 = T * T;
        const T3 = T2 * T;
        const T4 = T3 * T;
        let jde =
          2451550.09765 +
          29.530588853 * k +
          0.0001337 * T2 -
          0.00000015 * T3 +
          0.00000000073 * T4;
        const M = norm(
          2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3,
        );
        const Mp = norm(
          201.5643 +
            385.81693528 * k +
            0.0107582 * T2 +
            0.00001238 * T3 -
            0.000000058 * T4,
        );
        const F = norm(
          160.7108 +
            390.67050284 * k -
            0.0016118 * T2 -
            0.00000227 * T3 +
            0.000000011 * T4,
        );
        const O = norm(
          124.7746 - 1.5637558 * k + 0.0020672 * T2 + 0.00000215 * T3,
        );
        const E = 1 - 0.002516 * T - 0.0000074 * T2;
        if (!full) {
          jde +=
            -0.4072 * sinD(Mp) +
            0.17241 * E * sinD(M) +
            0.01608 * sinD(2 * Mp) +
            0.01039 * sinD(2 * F) +
            0.00739 * E * sinD(Mp - M) -
            0.00514 * E * sinD(Mp + M) +
            0.00208 * E * E * sinD(2 * M) -
            0.00111 * sinD(Mp - 2 * F) -
            0.00057 * sinD(Mp + 2 * F) +
            0.00056 * E * sinD(2 * Mp + M) -
            0.00042 * sinD(3 * Mp) +
            0.00042 * E * sinD(M + 2 * F) +
            0.00038 * E * sinD(M - 2 * F) -
            0.00024 * E * sinD(2 * Mp - M) -
            0.00017 * sinD(O) -
            0.00007 * sinD(Mp + 2 * M) +
            0.00004 * sinD(2 * Mp - 2 * F) +
            0.00004 * sinD(3 * M) +
            0.00003 * sinD(Mp + M - 2 * F) +
            0.00003 * sinD(2 * Mp + 2 * F) -
            0.00003 * sinD(Mp + M + 2 * F) +
            0.00003 * sinD(Mp - M + 2 * F) -
            0.00002 * sinD(Mp - M - 2 * F) -
            0.00002 * sinD(3 * Mp + M) +
            0.00002 * sinD(4 * Mp);
        } else {
          jde +=
            -0.40614 * sinD(Mp) +
            0.17302 * E * sinD(M) +
            0.01614 * sinD(2 * Mp) +
            0.01043 * sinD(2 * F) +
            0.00734 * E * sinD(Mp - M) -
            0.00515 * E * sinD(Mp + M) +
            0.00209 * E * E * sinD(2 * M) -
            0.00111 * sinD(Mp - 2 * F) -
            0.00057 * sinD(Mp + 2 * F) +
            0.00056 * E * sinD(2 * Mp + M) -
            0.00042 * sinD(3 * Mp) +
            0.00042 * E * sinD(M + 2 * F) +
            0.00038 * E * sinD(M - 2 * F) -
            0.00024 * E * sinD(2 * Mp - M) -
            0.00017 * sinD(O) -
            0.00007 * sinD(Mp + 2 * M) +
            0.00004 * sinD(2 * Mp - 2 * F) +
            0.00004 * sinD(3 * M) +
            0.00003 * sinD(Mp + M - 2 * F) +
            0.00003 * sinD(Mp + M + 2 * F) -
            0.00003 * sinD(Mp - M + 2 * F) -
            0.00002 * sinD(Mp - M - 2 * F) -
            0.00002 * sinD(3 * Mp + M) +
            0.00002 * sinD(4 * Mp);
        }
        const A = [
          [299.77, 0.107408, -0.000325],
          [251.88, 0.016321, 0],
          [251.83, 26.651886, 0],
          [349.42, 36.412478, 0],
          [84.66, 18.206239, 0],
          [141.74, 53.303771, 0],
          [207.14, 2.453732, 0],
          [154.84, 7.30686, 0],
          [34.52, 27.261239, 0],
          [207.19, 0.121824, 0],
          [291.34, 1.844379, 0],
          [161.72, 24.198154, 0],
          [239.56, 25.513099, 0],
          [331.55, 3.592518, 0],
        ];
        const coefficients = [
          0.000325, 0.000165, 0.000164, 0.000126, 0.00011, 0.000062, 0.00006,
          0.000056, 0.000047, 0.000042, 0.00004, 0.000037, 0.000035, 0.000023,
        ];
        for (let i = 0; i < A.length; i++) {
          jde += coefficients[i] * sinD(A[i][0] + A[i][1] * k + A[i][2] * T2);
        }
        return (jde - 2440587.5) * DAY;
      }

      const jd = time / DAY + 2440587.5;

      const k = Math.round((jd - 2451550.09765) / 29.530588853);

      const window = lifetimeHours * 3600000;

      const events = [
        {
          type: "new",
          time: phaseTime(k, false),
        },
        {
          type: "new",
          time: phaseTime(k + 1, false),
        },
        {
          type: "full",
          time: phaseTime(k - 0.5, true),
        },
        {
          type: "full",
          time: phaseTime(k + 0.5, true),
        },
      ];

      const windows = events
        .map((event) => {
          const start = event.time - window;
          const end = event.time + window;

          return {
            ...event,
            start,
            end,
          };
        })
        .sort((a, b) => a.start - b.start);

      const current = windows.find(
        (event) => time >= event.start && time <= event.end,
      );

      const future = windows.find((event) => event.start > time);

      if (current) {
        return {
          active: true,
          type: current.type,

          event: new Date(current.time).toISOString(),

          start: new Date(current.start).toISOString(),

          end: new Date(current.end).toISOString(),

          eventUnix: Math.round(current.time),

          startUnix: Math.round(current.start),

          endUnix: Math.round(current.end),

          nextType: future ? future.type : null,

          nextEvent: future ? new Date(future.time).toISOString() : null,

          nextStart: future ? new Date(future.start).toISOString() : null,

          nextEnd: future ? new Date(future.end).toISOString() : null,

          nextEventUnix: future ? Math.round(future.time) : null,

          nextStartUnix: future ? Math.round(future.start) : null,

          nextEndUnix: future ? Math.round(future.end) : null,
        };
      }

      return {
        active: false,
        type: null,

        event: null,
        start: null,
        end: null,

        eventUnix: null,
        startUnix: null,
        endUnix: null,

        nextType: future ? future.type : null,

        nextEvent: future ? new Date(future.time).toISOString() : null,

        nextStart: future ? new Date(future.start).toISOString() : null,

        nextEnd: future ? new Date(future.end).toISOString() : null,

        nextEventUnix: future ? Math.round(future.time) : null,

        nextStartUnix: future ? Math.round(future.start) : null,

        nextEndUnix: future ? Math.round(future.end) : null,
      };
    };
    if (debug) console.log("[TimedImages] Moon script evaluated successfully");
  } catch (err) {
    if (debug)
      console.error("[TimedImages] Moon script evaluation FAILED", err);
    throw err;
  }

  let moon = {
    active: false,
    type: null,
    event: null,
    start: null,
    end: null,
    eventUnix: null,
    startUnix: null,
    endUnix: null,
    nextType: null,
    nextEvent: null,
    nextStart: null,
    nextEnd: null,
  };

  let evalError = null;

  try {
    const now = Clock.now();

    if (debug)
      console.log("[TimedImages] Initial getMoonBoardTheme()", {
        now,
        runbefore: config.moon.runbefore,
      });

    moon = window.getMoonBoardTheme(now, config.moon.runbefore);

    if (debug) console.log("[TimedImages] Initial moon result", moon);
  } catch (ee) {
    evalError = ee;

    if (debug)
      console.error("[TimedImages] Initial getMoonBoardTheme() FAILED", ee);
  }

  if (debug)
    console.log("[TimedImages] INIT Board themes: setupTimedImages", {
      config,
      set_new_image,
      moon,
      evalError,
    });

  let timer = null;
  let currentContent = null;

  async function apply(debug = false) {
    if (debug) console.group("[TimedImages] apply()");

    try {
      if (timer) {
        if (debug) console.log("[TimedImages] Clearing existing timer", timer);

        clearTimeout(timer);
        timer = null;
      }

      const now = Clock.now();

      if (debug)
        console.log("[TimedImages] Current time", {
          now,
          date: new Date(now).toISOString(),
          currentContent,
        });

      let active = null;
      let nextChange = Infinity;

      if (debug) console.group("[TimedImages] Checking timed items");

      for (const [index, item] of config.timed.entries()) {
        const start = Date.parse(item.start);
        const end = Date.parse(item.end);

        const isActive = now >= start && now < end;

        const isFuture = now < start;

        if (debug)
          console.log(`[TimedImages] Item #${index}`, {
            item,
            start,
            startDate: isNaN(start)
              ? "INVALID DATE"
              : new Date(start).toISOString(),
            end,
            endDate: isNaN(end) ? "INVALID DATE" : new Date(end).toISOString(),
            isActive,
            isFuture,
          });

        if (isActive) {
          active = item;

          if (debug)
            console.log(`[TimedImages] Item #${index} is ACTIVE`, {
              content: item.content,
              end,
            });

          if (end < nextChange) {
            nextChange = end;

            if (debug)
              console.log("[TimedImages] nextChange updated from active item", {
                nextChange,
                nextChangeDate: new Date(nextChange).toISOString(),
              });
          }
        } else if (isFuture) {
          if (start < nextChange) {
            nextChange = start;

            if (debug)
              console.log("[TimedImages] nextChange updated from future item", {
                nextChange,
                nextChangeDate: new Date(nextChange).toISOString(),
              });
          }
        }
      }

      if (debug) console.groupEnd();

      if (debug)
        console.log("[TimedImages] Timed item selection complete", {
          active,
          nextChange,
          nextChangeDate:
            nextChange !== Infinity ? new Date(nextChange).toISOString() : null,
        });

      // ---------------------------------------------------------
      // MOON
      // ---------------------------------------------------------

      if (debug) console.group("[TimedImages] Moon calculation");

      if (debug)
        console.log("[TimedImages] Calling getMoonBoardTheme()", {
          now,
          runbefore: config.moon.runbefore,
        });

      try {
        moon = window.getMoonBoardTheme(now, config.moon.runbefore);

        if (debug) console.log("[TimedImages] Moon result", moon);
      } catch (err) {
        if (debug)
          console.error("[TimedImages] getMoonBoardTheme() FAILED", err);

        moon = {
          active: false,
          type: null,
          event: null,
          start: null,
          end: null,
          eventUnix: null,
          startUnix: null,
          endUnix: null,
          nextType: null,
          nextEvent: null,
          nextStart: null,
          nextEnd: null,
        };
      }

      let moonActive = false;

      if (moon.active && moon.type) {
        moonActive = true;

        const moonContent = config.moon[moon.type];

        if (debug)
          console.log("[TimedImages] Moon is ACTIVE", {
            type: moon.type,
            event: moon.event,
            start: moon.start,
            end: moon.end,
            eventUnix: moon.eventUnix,
            startUnix: moon.startUnix,
            endUnix: moon.endUnix,
            moonContent,
          });

        if (moonContent) {
          active = {
            content: moonContent,
            __moon: true,
          };

          if (debug)
            console.log("[TimedImages] Moon content selected", {
              type: moon.type,
              content: moonContent,
            });
        } else {
          if (debug)
            console.warn("[TimedImages] Moon is active but no content exists", {
              type: moon.type,
              availableMoonKeys: Object.keys(config.moon),
            });
        }

        if (moon.endUnix != null && moon.endUnix < nextChange) {
          nextChange = moon.endUnix;

          if (debug)
            console.log("[TimedImages] nextChange updated from moon end", {
              nextChange,
              nextChangeDate: new Date(nextChange).toISOString(),
            });
        }
      } else if (moon.nextStart) {
        const nextStart = Date.parse(moon.nextStart);

        if (debug)
          console.log("[TimedImages] Moon inactive", {
            nextStart: moon.nextStart,
            nextStartUnix: nextStart,
            nextStartDate: isNaN(nextStart)
              ? "INVALID DATE"
              : new Date(nextStart).toISOString(),
          });

        if (!isNaN(nextStart) && nextStart < nextChange) {
          nextChange = nextStart;

          console.log("[TimedImages] nextChange updated from next moon start", {
            nextChange,
            nextChangeDate: new Date(nextChange).toISOString(),
          });
        }
      } else {
        if (debug)
          console.log("[TimedImages] Moon inactive and has no nextStart");
      }

      if (debug) console.groupEnd();

      // ---------------------------------------------------------
      // CONTENT SELECTION
      // ---------------------------------------------------------

      const images = active ? config.images[active.content] : config.fallback;

      const contentKey = moonActive
        ? "__moon_" + moon.type
        : active
          ? active.content
          : "__fallback__";

      if (debug)
        console.log("[TimedImages] Content selection", {
          active,
          moonActive,
          moonType: moon.type,
          contentKey,
          previousContent: currentContent,
          changed: contentKey !== currentContent,
          images,
        });

      if (!images) {
        if (debug)
          console.error("[TimedImages] NO IMAGES FOUND FOR CONTENT", {
            contentKey,
            active,
            moonActive,
            moonType: moon.type,
            availableImageKeys: Object.keys(config.images || {}),
          });
      }

      // ---------------------------------------------------------
      // APPLY CONTENT
      // ---------------------------------------------------------

      if (images && contentKey !== currentContent) {
        if (debug)
          console.log("[TimedImages] Content CHANGED - applying images", {
            from: currentContent,
            to: contentKey,
          });

        currentContent = contentKey;

        for (const [key, path] of Object.entries(images)) {
          if (debug)
            console.log("[TimedImages] Processing image entry", {
              key,
              path,
            });

          if (key !== "_animate" && key !== "_theme") {
            if (key === "board") {
              if (debug)
                console.log("[TimedImages] Updating board background", {
                  animation: images._animate,
                });

              try {
                await setBackground(images._animate);

                if (debug)
                  console.log("[TimedImages] setBackground() completed");
              } catch (err) {
                if (debug)
                  console.error("[TimedImages] setBackground() FAILED", err);
              }
            }

            if (debug)
              console.log("[TimedImages] Calling set_new_image()", {
                key,
                path,
              });

            try {
              set_new_image(key, path);

              if (debug)
                console.log("[TimedImages] set_new_image() completed", {
                  key,
                });
            } catch (err) {
              if (debug)
                console.error("[TimedImages] set_new_image() FAILED", {
                  key,
                  path,
                  error: err,
                });
            }
          } else if (key === "_theme") {
            if (debug)
              console.log("[TimedImages] Applying dynamic CSS", {
                theme: images._theme,
              });

            const css = generateCSS(images._theme);

            const styleElement = document.getElementById("dynamic-css");

            if (!styleElement) {
              if (debug)
                console.error("[TimedImages] #dynamic-css element NOT FOUND");
            } else {
              styleElement.textContent = css;

              if (debug)
                console.log("[TimedImages] Dynamic CSS applied", {
                  cssLength: css?.length,
                });
            }
          }
        }
      } else if (!images) {
        if (debug)
          console.warn(
            "[TimedImages] Skipping image application because images is missing",
          );
      } else {
        if (debug)
          console.log("[TimedImages] Content unchanged - no image update", {
            contentKey,
            currentContent,
          });
      }

      // ---------------------------------------------------------
      // TIMER
      // ---------------------------------------------------------

      if (nextChange !== Infinity) {
        const clockNow = Clock.now();

        const delay = Math.max(0, nextChange - clockNow);

        const MAX_DELAY = 0x7fffffff;

        const actualDelay = Math.min(delay, MAX_DELAY);

        if (debug)
          console.log("[TimedImages] Scheduling next apply()", {
            nextChange,
            nextChangeDate: new Date(nextChange).toISOString(),
            clockNow,
            clockNowDate: new Date(clockNow).toISOString(),
            delay,
            actualDelay,
            delayMinutes: actualDelay / 1000 / 60,
          });

        timer = setTimeout(apply, actualDelay);

        if (debug)
          console.log("[TimedImages] Timer scheduled", {
            timer,
          });
      } else {
        if (debug)
          console.log("[TimedImages] No next change - no timer scheduled");
      }
    } catch (err) {
      if (debug) console.error("[TimedImages] apply() UNHANDLED ERROR", err);
    } finally {
      if (debug)
        console.log("[TimedImages] apply() END", {
          currentContent,
          timer,
        });

      if (debug) console.groupEnd();
    }
  }

  if (debug) console.log("[TimedImages] Calling initial apply()");

  await apply(debug);

  if (debug)
    console.log("[TimedImages] setupTimedImages() READY", {
      currentContent,
      timer,
    });

  return {
    refresh: apply(debug),

    destroy() {
      if (debug)
        console.log("[TimedImages] destroy()", {
          timer,
          currentContent,
        });

      if (timer) {
        clearTimeout(timer);
        timer = null;

        if (debug) console.log("[TimedImages] Timer cleared");
      }
    },
  };
};
//////////////////////////////////////////////////
// BOARD THEME SCRIPTS
//////////////////////////////////////////////////
