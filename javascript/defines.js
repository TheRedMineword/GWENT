"use strict"
let twoPlayersConnected = false; //host alone
 //host alone


const OnGameStartDraw = 2;
const tooltipQueue = [];
let tooltipActive = false;
const ForGameStart = {
 'unitscards': 22,
 'special': 10,
 'hero': 15
};
const maxhealth = 2; // Dont change it, it also should do nothing
const thishandsize = 10;
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
	'faction_ability': 1200,
	'show_me_that_card_you_have': 2900
}


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

