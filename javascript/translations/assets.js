const lang = navigator.language.split("-")[0];
console.log(`User Langue String: ${lang}`);
async function loadScriptEval(url) {
  const code = await fetch(url).then((r) => r.text());
  return eval(code);
}
let STRNG = {};
STRNG["failure"] = {
  en: { b: "No translation for the key %s", a: "NO-TEXT" },
  pl: { b: "Brak klucza tłumaczenia dla %s", a: "BRAK-TEKSTU" },
};

function cssEscapeContent(str) {
  return str.replace(/\\/g, "\\\\").replace(/\n/g, "\\A ").replace(/"/g, '\\"');
}

function buildNotificationTranslations() {
  let css = `
    #notif-nilfgaard-wins-draws {
	background-image: url(img/icons/notif_nilfgaard.png);
}

#notif-nilfgaard-wins-draws::after {
	content: "Nilfgaard wins draws";
}

#notif-me_win_via_nilfgaard {
	background-image: url(img/icons/notif_nilfgaard.png);
}

#notif-me_win_via_nilfgaard::after {
	content: "Nilfgaard  faction ability triggered: \A Nilfgaard wins any round that ends in a draw. ";
}

#notif-op_win_via_nilfgaard {
	background-image: url(img/icons/notif_nilfgaard.png);
}

#notif-op_win_via_nilfgaard::after {
	content: "Nilfgaard  faction ability triggered: \A Nilfgaard wins any round that ends in a draw. ";
}


#notif-op-leader::after {
	content: "Opponent uses leader";
}

#notif-op-white-flame {
	background-image: url(img/icons/notif_nilfgaard.png);
}

#notif-op-white-flame::after {
	content: "The opponent's leader cancel \A your opponent's Leader Ability";
}

#notif-meve_white_queen {
	background-image: url(img/icons/notif_lyria_rivia.png);
}

#notif-meve_white_queen::after {
	content: "Lyria & Rivia leader allows both players to restore \A 2 units when using the medic ability.";
}

#notif-medicextra {
	background-image: url(img/icons/anim_medic.png);
}

#notif-medicextra::after {
	content: "You and opponent can revive extra card from medic ability! ";
}

#notif-me-first::after {
	content: "You will go first";
}

#notif-op-first::after {
	content: "Your opponent will go first";
}

#notif-me-coin {
	background-image: url(img/icons/notif_me_coin.png);
}

#notif-me-coin-lambert {
	background-image: url(img/icons/notif_me_coin-lambert.png);
}

#notif-me-coin::after {
	content: "You will go first";
}

#notif-me-coin-lambert::after {
	content: "Lambert lets you start the game";
}

#notif-op-coin {
	background-image: url(img/icons/notif_op_coin.png);
}

#notif-op-coin-lambert {
	background-image: url(img/icons/notif_op_coin-lambert.png);
}

#notif-op-coin::after {
	content: "Your opponent will go first";
}

#notif-op-coin-lambert::after {
	content: "Lambert says that you suck! \A The opponent starts the game!";
}

#notif-round-start {
	background-image: url(img/icons/notif_round_start.png);
}

#notif-round-start::after {
	content: "Round Start";
}

#notif-me-pass {
	background-image: url(img/icons/notif_round_passed.png);
}

#notif-me-pass::after {
	content: "Round passed";
}

#notif-op-pass {
	background-image: url(img/icons/notif_round_passed.png);
}

#notif-op-pass::after {
	content: "Your opponent has passed";
}

#notif-win-round {
	background-image: url(img/icons/notif_win_round.png);
}

#notif-win-round::after {
	content: "You won the round!";
}

#notif-win-opleft {
	background-image: url(img/icons/notif_win_round.png);
}

#notif-win-opleft::after {
	content: "Your opponent left the game";
}

#notif-sv-err {
	background-image: url(img/icons/notif_lose_round.png);
}

#notif-sv-err::after {
	content: "Lost connection to the server";
}

#notif-lose-round {
	background-image: url(img/icons/notif_lose_round.png);
}

#notif-lose-round::after {
	content: "Your opponent won the round";
}

#notif-draw-round {
	background-image: url(img/icons/notif_draw_round.png);
}

#notif-draw-round::after {
	content: "The round ended in a draw";
}

#notif-me-turn {
	background-image: url(img/icons/notif_me_turn.png);
}

#notif-me-turn::after {
	content: "Your turn!";
}

#notif-op-turn {
	background-image: url(img/icons/notif_op_turn.png);
}

#notif-op-turn::after {
	content: "Opponent's turn";
}

#notif-north, #notif-north-scorch-cancelled {
	background-image: url(img/icons/notif_north.png);
}

#notif-north::after {
	content: "Northern Realms faction ability triggered: \A North draws an additional card.";
}

#notif-scol_secondchance {
	background-image: url(img/icons/notif_scoiatael.png);
}

#notif-scol_secondchance_necro1 {
	background-image: url(img/icons/notif_scoiatael.png);
}
#notif-gaunter::after {
	content: "Gaunter o'Dim Ability Used \A Both sides recived additional card!";
}

#notif-gaunter {
	background-image: url(img/icons/icon_card_count.png);
}

#notif-scol_secondchance_necro2::after {
	content: "Gaunter o'Dim Ability Used \A Both sides recived additional card!";
}

#notif-scol_secondchance::after {
	content: "Scoia'tael leader passive ability triggered: \A Scoia'tael draws an additional card from grave.";
}

#notif-north-scorch-cancelled::after {
	content: "Northern Realms leader ability used: \A Scorch ability cancelled for the rest of the round.";
}

#notif-monsters {
	background-image: url(img/icons/notif_monsters.png);
}

#notif-monsters::after {
	content: "Monsters faction ability triggered: \A one Monster Unit Card stays on the board";
}

#notif-draw_end {
	background-image: url(img/icons/notif_lose_round.png);
}

#notif-draw_end::after {
	content: "Gwent game can't end in a draw! \A Face opponent again till winner is picked!";
}

#notif-scol_pick {
	background-image: url(img/icons/notif_scoiatael.png);
}

#notif-scol_pick::after {
	content: "Opponent used Scoia'tael faction ability to pick who play first!";
}

#notif-sky {
	background-image: url(img/icons/notif_sky.png);
}

#notif-sky::after {
	content: "Sky Kindom faction ability triggered: \A One Sky Kindom Unit Card stays on the board";
}

#notif-darkstorm::after {
	content: "Darkness is here... \A Darkness bring destruction to the close combat row!";
}

#notif-darkstorm {
	background-image: url(img/icons/notif_darknessishere.png);
}

#notif-scoiatael {
	background-image: url(img/icons/notif_scoiatael.png);
}

#notif-scoiatael::after {
	content: "Opponent used the Scoia'tael faction perk to go first.";
}

#notif-skellige-op {
	background-image: url(img/icons/notif_skellige.png);
}

#notif-skellige-op::after {
	content: "Opponent Skellige Ability Triggered!";
}

#notif-skellige-me {
	background-image: url(img/icons/notif_skellige.png);
}

#notif-skellige-me::after {
	content: "Skellige Ability Triggered!";
}

#notif-witcher_universe {
	background-image: url(img/icons/notif_witcher_universe.png);
}

#notif-witcher_universe::after {
	content: "Witcher Universe faction ability used: \A Turn skipped.";
}

#notif-toussaint, #notif-toussaint-decoy-cancelled {
	background-image: url(img/icons/notif_toussaint.png);
}

#notif-toussaint::after{
	content: "Toussaint faction ability used: \A Toussaint draws an additional card.";
}

#notif-toussaint-decoy-cancelled::after {
	content: "Toussaint leader ability used: \A Decoy ability cancelled for the rest of the round.";
}

#notif-lyria_rivia {
	background-image: url(img/icons/notif_lyria_rivia.png);
}

#notif-lyria_rivia::after {
	content: "Lyria & Rivia faction ability used: \A Morale Boost effect applied to a row.";
}

#notif-zerrikania {
    background-image: url(img/icons/notif_zerrikania.png);
}

#notif-zerrikania::after {
    content: "Zerrikania faction ability used: \A Unit restored from the discard pile.";
}

#notif-coin-false_player-me {
	background-image: url(img/icons/coin_classic_notif/notif_me_coin.png);
}

#notif-coin-false_player-me::after {
	content: "You skipped your turn";
}

#notif-coin-true_player-me {
	background-image: url(img/icons/coin_classic_notif/notif_op_coin.png);
}

#notif-coin-true_player-me::after {
	content: "You skipped your turn \A But your opponent received an additional card";
}

#notif-coin-false_player-op {
	background-image: url(img/icons/coin_classic_notif/notif_op_coin.png);
}

#notif-coin-false_player-op::after {
	content: "Your opponent skipped their turn";
}

#notif-coin-true_player-op {
	background-image: url(img/icons/coin_classic_notif/notif_me_coin.png);
}

#notif-coin-true_player-op::after {
	content: "Your opponent skipped their turn \A And you received an additional card";
}

#notif-whiteflame2-op_nilfgaard {
	background-image: url(img/icons/notif_nilfgaard.png);
}

#notif-whiteflame2-op_nilfgaard::after {
	content: "Your opponent copied your leader ability";
}

#notif-whiteflame2-op_syndicate {
	background-image: url(img/icons/notif_syndicate.png);
}

#notif-whiteflame2-op_syndicate::after {
	content: "Your opponent copied your leader ability";
}

#notif-whiteflame2-me_nilfgaard {
	background-image: url(img/icons/notif_nilfgaard.png);
}

#notif-whiteflame2-me_nilfgaard::after {
	content: "You copied opponent leader ability!";
}

#notif-whiteflame2-me_syndicate {
	background-image: url(img/icons/notif_syndicate.png);
}

#notif-whiteflame2-me_syndicate::after {
	content: "You copied opponent leader ability!";
}`;

  document.querySelectorAll("[id^='notif-']").forEach((el) => {
    const key = el.id.substring(6); // remove "notif-"

    const text = getTranslation(`ui.notifs.${key}`);
    if (!text) return;

    css += `
#${el.id}::after {
    content: "${cssEscapeContent(text)}";
}
`;
  });

  let style = document.getElementById("abilities_translation");
  if (!style) {
    style = document.createElement("style");
    style.id = "abilities_translation";
    document.head.appendChild(style);
  }

  style.textContent = css;

  console.log(style, css);
}
buildNotificationTranslations();
function translateabilitydict() {
  return Object.fromEntries(
    Object.entries(ability_dict).map(([ability, data]) => [
      ability,
      {
        ...data,
        ...(data.name !== undefined && {
          name: getTranslation(`ability.${ability}.name`),
        }),
        ...(data.description !== undefined && {
          description: getTranslation(`ability.${ability}.description`),
        }),
      },
    ]),
  );
}
function translateCardDict() {
  return card_dict.map((card) => {
    const translation = getTranslation_cards(`card.${card.filename}`);

    return {
      ...card,
      ...(translation ? { name: translation } : {}),
    };
  });
}
function translatefactionsdict() {
  return Object.fromEntries(
    Object.entries(factions).map(([ability, data]) => [
      ability,
      {
        ...data,
        name: getTranslation(`factions.${ability}.name`),
        description: getTranslation(`factions.${ability}.description`),
      },
    ]),
  );
}
function getNested(obj, path) {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

function getTranslation(key) {
  const langResult = getNested(STRNG[lang], key);

  if (langResult !== undefined) {
    return langResult;
  }

  const engResult = getNested(STRNG.en, key);

  if (engResult !== undefined) {
    return engResult;
  }

  const failure =
    STRNG.failure?.[lang]?.b ??
    STRNG.failure?.en?.b ??
    `Missing translation: %s`;

  return failure.replace("%s", key);
}

function getTranslation_cards(key) {
  const langResult = getNested(STRNG[lang], key);

  if (langResult !== undefined) {
    return langResult;
  }

  const engResult = getNested(STRNG.en, key);

  if (engResult !== undefined) {
    return engResult;
  }

  return false;
}
function getUiStrng(key) {
  return getTranslation(`ui.elem.${key}`);
}
function getUiStrngDefinesJS(key) {
  return getTranslation(`ui.elem.definesJS.${key}`);
}
function getUiHtmlStrng_escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function translate_ui_hub() {
  document.getElementById("create-game").textContent = getTranslation(
    "ui.mmenu.create-game",
  ); //"Create Server";
  document.getElementById("join-game").textContent =
    getTranslation("ui.mmenu.joingame"); //"Join Server";
  document.getElementById("session-start-control").textContent = getTranslation(
    "ui.mmenu.session-start-control_ready",
  ); //"Ready";
  document.getElementById("cancel-game").textContent =
    getTranslation("ui.mmenu.cancel"); //"Cancel";
  document.getElementById("copy-session").textContent =
    getTranslation("ui.mmenu.copy"); //"Copy Session";
  document.getElementById("toggle-music").textContent =
    getTranslation("ui.mmenu.music"); //"♫ Music";
  document.getElementById("opponent-name").textContent =
    getTranslation("ui.mmenu.no-op"); //"No Opponent";
  document.getElementById("chat-toggle").textContent =
    getTranslation("ui.mmenu.chat");
}
function getUiHtmlStrng(key, linebreakertobr = false) {
  let html = getUiStrng(`html.${key}`);

  // Sanitize HTML (using DOMPurify as an example)
  html = getUiHtmlStrng_escapeHtml(html);

  // Optionally convert line breaks to <br>
  if (linebreakertobr) {
    html = html.replace(/\r\n|\r|\n/g, "<br>");
  }

  return html;
}
