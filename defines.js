"use strict"
const OnGameStartDraw = 2;
const ForGameStart = {
 'unitscards': 22,
 'special': 10,
 'hero': 15
};
const maxhealth = 2; // Dont change it, it also should do nothing
const thishandsize = 10;
console.log("Game Start Config", ForGameStart, "hand size:", thishandsize);
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