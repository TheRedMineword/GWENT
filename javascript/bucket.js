"use strict";
let Bucket = null;
let player_board = null;
function init_bucket() {
  Bucket = new Row(document.getElementById("bucket"));
  player_board = new Player("neither", "BoardBot", {
    faction: "monsters",
    leader: {
      name: "Eredin - Dowódca Czerwonych Jeźdźców",
      id: "134",
      deck: "monsters",
      row: "leader",
      strength: "",
      ability: "eredin_commander",
      filename: "eredin_bronze",
      count: "1",
      name_muster: "Eredin - Commander of the Red Riders",
      name_english: "Eredin — Commander of the Red Riders",
    },
    cards: [],
  });
  document.getElementById("bucket").classList.add("hidden-row");
  return Bucket;
}

async function bucket_add_card_by_index(index) {
  if (game.usebucket) {
    var card = await new Card(card_dict[index], player_board);
    await Bucket.addCard(card);
    var txt_draw = getUiStrng("bucket").replace(
      "%s",
      card_dict[index]?.name || "",
    );
    console.log(txt_draw);
    cardredrawnotice(txt_draw);
    await card.animate("reinforce");
    console.log("Added card", card, " to bucket player:", player_board);
    return {
      ok: true,
      card,
      html: Bucket,
    };
  }
  return {
    ok: false,
  };
}
function bucket_size() {
  Bucket.resizeCardContainer(1, 0, 0.2);
}

function reload_bucket_visual() {
  document.getElementById("bucket").classList.add("hidden-row");
  if (game.usebucket) {
    document.getElementById("bucket").classList.remove("hidden-row");
  }
}

const banned_bucket_abilities = [
  "aid",
  "morale",
  "reinforce",
  "scorch_s",
  "scorch_r",
  "scorch_c",
  "scorch_a",
  "scorch",
  "axii",
  "avenger",
  "berserker",
  "horn",
  "dopler",
  "mardroeme",
];

function getRandomAllowedCardIndex(card_dict) {
  const validIndexes = [];
  const _validIndexes = [];
  for (let i = 0; i < card_dict.length; i++) {
    const card = card_dict[i];

    if (
      Number(card.count) > 0 &&
      !card.ability
        .split(" ")
        .some((a) => banned_bucket_abilities.includes(a)) &&
      card.row !== "leader" &&
      card.deck !== "weather" &&
      card.strength > bucket_cards_strenght.bigger &&
      card.strength < bucket_cards_strenght.smaller
    ) {
      validIndexes.push(i);
      _validIndexes.push(card_dict[i]);
    }
  }

  if (validIndexes.length === 0) return -1;
  console.log("Valid buckets", _validIndexes);
  return validIndexes[Math.floor(Math.random() * validIndexes.length)];
}

async function random_to_bucket() {
  if (Bucket.cards.length > bucket_max - 1) {
    return "Too much";
  }
  var i = getRandomAllowedCardIndex(card_dict);
  comp_and_send(socket, JSON.stringify({ type: "bucket_this", index: i }));
  bucket_add_card_by_index(i);
}

function parse_action() {
  var c = game.roundHistory[game.roundHistory.length - 1];
  var tag = c.winner?.tag ?? "n/a";

  if (tag === "me") {
    return "give!me";
  }
  if (tag === "op") {
    return "give!op";
  }
  return "give!burn";
}

function parse_action_hand() {
  var c = game.roundHistory[game.roundHistory.length - 1];
  var tag = c.winner?.tag ?? "n/a";

  if (tag === "me") {
    return player_me.hand;
  }
  if (tag === "op") {
    return player_op.hand;
  }
  return null;
}

function parse_action_ping() {
  var c = game.roundHistory[game.roundHistory.length - 1];
  var tag = c.winner?.tag ?? "n/a";

  if (tag === "me") {
    return player_me;
  }
  if (tag === "op") {
    return player_op;
  }
  return null;
}
function parse_action_ping_loser() {
  var c = game.roundHistory[game.roundHistory.length - 1];
  var tag = c.winner?.tag ?? "n/a";

  if (tag === "me") {
    return player_op;
  }
  if (tag === "op") {
    return player_me;
  }
  return null;
}

async function END_TURN_SHARE_CARDS() {
  console.log("===== END_TURN_SHARE_CARDS =====");

  const cards = [...(Bucket.cards || [])];

  // Determine winner
  const lastRound = game.roundHistory?.[game.roundHistory.length - 1];
  const winnerTag = lastRound?.winner?.tag ?? null;

  console.log("Winner:", winnerTag);
  console.log("Cards:", cards);

  // Create / get FX layer (independent from bucket)
  let fxLayer = document.getElementById("fx-layer");
  if (!fxLayer) {
    fxLayer = document.createElement("div");
    fxLayer.id = "fx-layer";

    Object.assign(fxLayer.style, {
      position: "fixed",
      inset: "0",
      overflow: "hidden",
      pointerEvents: "none",
      zIndex: "999999999",
    });

    document.body.appendChild(fxLayer);
  }

  // Get bucket position BEFORE clearing it
  const bucketElem = document.getElementById("bucket");
  if (!bucketElem) {
    console.error("Bucket element not found.");
    return;
  }

  const bucketRect = bucketElem.getBoundingClientRect();

  console.log("Bucket rect:", bucketRect);
  if (parse_action() !== "give!burn") {
    // Clone cards to winner's hand
    const winnerHand = parse_action_hand();

    for (const card of cards) {
      try {
        const clone = new Card(card._raw, parse_action_ping());
        winnerHand.addCard(clone);
        clone.animate("reinforce");
      } catch (e) {
        console.error("Failed to clone card:", e);
      }
    }
  }

  // Calculate stars
  const totalStrength = cards.reduce(
    (sum, card) => sum + Math.abs(Number(card.power ?? 0)),
    0,
  );
  const total_cards = Bucket.cards.length;
  const starsCount = Math.max(1, totalStrength);
  const draws = Math.floor(starsCount / bucket_op_draw_per_power);
  console.log("Spawning", starsCount, "stars");

  // Clear bucket immediately (effects won't be affected)
  if (typeof Bucket.reset === "function") {
    Bucket.reset();
  } else {
    Bucket.cards = [];
  }
  if (parse_action() !== "give!burn") {
    // Spawn stars from bucket center
    const startX = bucketRect.left + bucketRect.width / 2;
    const startY = bucketRect.top + bucketRect.height / 2;

    for (let i = 0; i < starsCount; i++) {
      const star = document.createElement("div");

      star.textContent = "⭐";

      Object.assign(star.style, {
        position: "fixed",
        left: `${startX}px`,
        top: `${startY}px`,
        fontSize: "24px",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: "999999999",
        willChange: "transform, opacity",
      });

      fxLayer.appendChild(star);

      // Random spread
      const dx = (Math.random() - 0.5) * 250;

      const dy =
        winnerTag === "me"
          ? -(180 + Math.random() * 120)
          : 180 + Math.random() * 120;

      const rot = (Math.random() - 0.5) * 720;

      const scale = 0.6 + Math.random() * 0.8;

      star.animate(
        [
          {
            transform: "translate(-50%, -50%) scale(1) rotate(0deg)",
            opacity: 1,
          },
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale}) rotate(${rot}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: 1200 + Math.random() * 600,
          easing: "ease-out",
          fill: "forwards",
        },
      ).onfinish = () => {
        star.remove();
      };
    }
    for (let i = 0; i < draws; i++) {
      await parse_action_ping_loser().deck.draw(parse_action_ping_loser().hand);
    }
  }
  console.log("Done.");
}

function is_bucket_vibecheck_name(vara) {
  var map = {
    bucket: true,
  };

  return map[vara] ?? false;
}

function BUCKET_summon_random_allowed() {
  var rounds = bucket_spawn_base;
  var led = 0;
  if (is_bucket_vibecheck_name(player_me.leader.abilities[0])) {
    rounds = rounds - bucket_spawn_per_lider_minus;
    led++;
  }
  if (is_bucket_vibecheck_name(player_op.leader.abilities[0])) {
    rounds = rounds - bucket_spawn_per_lider_minus;
    led++;
  }
  var is = (turncount - 1) % rounds === 0;
  var a = {
    res: is,
    led: led,
    turn: turncount - 1,
    every: rounds,
    is: `((${turncount} - 1) % ${rounds} === 0)`,
  };
  console.log("IS BUCKET ALLOWED TO SUMMON?", a);
  return a;
}
