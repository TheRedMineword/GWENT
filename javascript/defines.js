"use strict"
let twoPlayersConnected = false; //host alone
let extraJSON = null;
let gameended = false;
 //host alone
const players = {
	'me': "You", "op": "Opponent"
}
const fullscreenConfig = {
	'localhost': false,
	'else': true
}

const OnGameStartDraw = 2;
const tooltipQueue = [];
let tooltipActive = false;
const ForGameStart = {
 'unitscards': 22,
 'special': 10,
 'hero': 9
};
const maxhealth = 2; // Dont change it, it also should do nothing
const thishandsize = 10;

const sendQueue = [];
let queueRunning = false;

const SEND_INTERVAL_MS = 700; // change this to desired wait time


const ui_display_times = {
	'socketready': 3000,
	'hold_pause': {
		'sleep': 78,
		'needs': 6
	},
	'queue': [],
	'is_running': false,
	'is_busy': false,
	'round_end_result': 2200,
	'notyfication': 2200, // From async notification(name, duration) // a fail save value
	'fadeSpeed': 150,
	'checkDelay': 25,
	'pass': 1320,
	'turn': 1200,
	'round_start': 1200,
	'coin': 1200,
	'faction_ability': 2700,
	'show_me_that_card_you_have': 2900
}


const RegisterMovesHold = 2700 + SEND_INTERVAL_MS + ui_display_times.show_me_that_card_you_have; //If op passed wait before moves
const resync_wait = 1000 * 0.01;

ui_display_times.is_transitioning = false;
const ongame_start_eval = "console.log(\"evaled start game\");\n(function notificationRepeat() {\r\n  ui.notificationLoop();\r\n  setTimeout(notificationRepeat, ui_display_times.checkDelay);\r\n})();";

console.log("Game Start Config", ForGameStart, "hand size:", thishandsize, "ui_display_times", ui_display_times, "ongame_start_eval", ongame_start_eval);
const spy = {
    'spy': 2,
    'aid': 5,
    'sabotage': 1
};
console.log("Spy draw:", spy);

const nilfard_drawmaster =
{
	// Minimum hand size check:
	// Effect only triggers if player has LESS than this many cards in hand
	handshort: 3,

	// Maximum bonus draws from graveyard:
	// Each unit in grave = +1 draw, capped at this value
	drawdead: 2,

	// Base number of cards always drawn from deck
	drawalive: 1,

	// (Legacy / currently unused in logic)
	// Previously used as fallback draw amount when graveyard was insufficient
	drawiffail: 0,

	// Starting hand penalty:
	// Player begins the game with fewer cards based on this value
	cardban: 0,
	drawextra: 1
};

// Derived values:

// Player starts with (handshort - 1) fewer cards
// Example: handshort = 3 → start with 2 fewer cards
nilfard_drawmaster.cardban = -1 + nilfard_drawmaster.handshort;

// (Legacy formula, no longer used by current draw logic)
// Originally matched total fallback draw amount
nilfard_drawmaster.drawiffail =
	-1 + nilfard_drawmaster.drawdead + nilfard_drawmaster.drawalive;

console.log("nilfard_drawmaster", nilfard_drawmaster);


const audio_cache = {};
const audio_yt_vid_soundtrack = "FTsuevfvQ9w"; // wild hunt: "UE9fPWy1_o4" // How about round of gwent: "FTsuevfvQ9w"
const audio_yt_vid_soundtrack_volume = 47; // 100 for wild hunt, less for other

const gaunter_lider = {
	"extra_cards": 0.50,
	"revive": 0.60
}
console.log("gaunter_lider", gaunter_lider);
