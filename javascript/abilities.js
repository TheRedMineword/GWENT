"use strict"

function findAvengerTarget(cardName) {
	console.log("findAvengerTarget(\"",cardName,"\");");
	return card_dict.find(c => c.avenger === cardName);
}
function findReinforceTargets(cardName) {
	console.log("findReinforceTargets(\"", cardName, "\");");

	return card_dict.filter(c =>
		c.reinforce &&
		c.reinforce.owner_name === cardName
	);
}
function time_now_utc_to_b64() {
    // Get UTC date parts only (day-level uniqueness)
    const now = new Date();

    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");

    // stable per-day string
    const dateStr = `${year}-${month}-${day}`;

    // base64 encode
    return btoa(dateStr);
}
let magicthegathering_stable = null;
if (mtg_conf.unstable_mode === "random"){
	magicthegathering_stable = "This card is unstable, each turn it power will change in most of the time negative numbers (On averge power will be -3.27) "
} else if (mtg_conf.unstable_mode === "unrandom"){
	magicthegathering_stable = "This card is unstable, after picking card it power will drop to -3 "
}
const NotPickUpAbilities = ["axii2_desc", "gryffinSchool", "magicthegathering", "tgc_portal", "reinforce", "wshield"];


var ability_dict = {
	clear: {
		name: "Clear Weather",
		description: "Removes all Weather Cards (Biting Frost, Impenetrable Fog and Torrential Rain) effects. "
	},
	frost: {
		name: "Biting Frost",
		description: "Sets the strength of all Close Combat cards to 1 for both players. "
	},
	fog: {
		name: "Impenetrable Fog",
		description: "Sets the strength of all Ranged Combat cards to 1 for both players. "
	},
	rain: {
		name: "Torrential Rain",
		description: "Sets the strength of all Siege Combat cards to 1 for both players. "
	},
	storm: {
		name: "Skellige Storm",
		description: "Reduces the Strength of all Range and Siege Units to 1. "
	},
	hero: {
		name: "Hero Card",
		description: "Not affected by any Special Cards or abilities. "
	},
	decoy: {
		name: "Decoy",
		description: "Swap with a card on the battlefield to return it to your hand. "
	},
	wshield: {
		name: "Shield",
		description: "Partialy protects all cards in same row from weather card effects, Commander's Horn will have no effect in that row. Cant be picked up after placing. ",
		placed: async card => await card.animate("wshield")
	},
	quen_desc: {
		name: "Witcher Signs: Quen",
		description: ""
	},
	yrden: {
		name: "Witcher Signs: Yrden",
		description: "Witchers Magic Trap, place on enemy ranged row to aplly -1 to each unit card. Effects stacks. Decoy can be used to pick up the card! "
	},
	horn: {
		name: "Commander's Horn",
		description: "Doubles the strength of all unit cards in that row. Limited to 1 per row. ",
		placed: async card => await card.animate("horn")
	},
	darkstormegen: {
		name: "Darkness Storm",
		description: "Darkness rages around this card! All non-hero card around in same row will be destroyed!",
		placed: async card => await card.animate("darkstrom")
	},
	mardroeme: {
		name: "Mardroeme",
		description: "Triggers transformation of all Berserker cards on the same row. ",
		placed: async (card, row) => {
			let berserkers = row.findCards(c => c.abilities.includes("berserker"));
			await Promise.all(berserkers.map(async c => await ability_dict["berserker"].placed(c, row)));
		}
	},
	berserker: {
	name: "Berserker",
	description: "Transforms into a bear when a Mardroeme card is on its row.",
	placed: async (card, row) => {
		if (row.effects.mardroeme === 0)
			return;

		row.removeCard(card);

		const isYoung = card.name.includes("Young");
		const transformedName = isYoung
			? "Transformed Young Vildkaarl"
			: "Transformed Vildkaarl";

		const targetData = Object.values(card_dict).find(c => c.name === transformedName);

		if (!targetData) {
			console.warn("No transformed card found for:", card.name);
			return;
		}
		var Mutatant = new Card(targetData, card.holder);
		await row.addCard(Mutatant);
		try {Mutatant.animate("avenger_spawn_creature");} catch (e) {console.error(targetData, Mutatant, e, "BERSERKS")}
	}
},
	scorch: {
		name: "Scorch",
		description: "Discard after playing. Kills the strongest card(s) on the battlefield. ",
		activated: async card => {	
			await ability_dict["scorch"].placed(card);
			await board.toGrave(card, card.holder.hand);
		},
		placed: async (card, row) => {
			if (row !== undefined)
				row.cards.splice( row.cards.indexOf(card), 1);
			let maxUnits = board.row.map( r => [r,r.maxUnits()] ).filter( p => p[1].length > 0);
			if (row !== undefined)
				row.cards.push(card);
			let maxPower = maxUnits.reduce( (a,p) => Math.max(a, p[1][0].power), 0 );
			let scorched = maxUnits.filter( p => p[1][0].power === maxPower);
			let cards = scorched.reduce( (a,p) => a.concat( p[1].map(u => [p[0], u])), []);
			
			await Promise.all(cards.map( async u => await u[1].animate("scorch", true, false)) );
			await Promise.all(cards.map( async u => await board.toGrave(u[1], u[0])) );
		}
	},
	scorch_c: {
		name: "Scorch - Close Combat",
		description: "Destroy your enemy's strongest Close Combat unit(s) if the combined strength of all his or her Close Combat units is 10 or more. ",
		placed: async (card) => await board.getRow(card, "close", card.holder.opponent()).scorch()
	},
	scorch_r: {
		name: "Scorch - Ranged",
		description: "Destroy your enemy's strongest Ranged Combat unit(s) if the combined strength of all his or her Ranged Combat units is 10 or more. ",
		placed: async (card) => await board.getRow(card, "ranged", card.holder.opponent()).scorch()
	},
	scorch_s: {
		name: "Scorch - Siege",
		description: "Destroys your enemy's strongest Siege Combat unit(s) if the combined strength of all his or her Siege Combat units is 10 or more. ",
		placed: async (card) => await board.getRow(card, "siege", card.holder.opponent()).scorch()
	},
	agile: {
		name:"agile", 
		description: "Can be placed in either the Close Combat or the Ranged Combat row. Cannot be moved once placed. "
	},
	muster: {
		name:"muster", 
		description: "Find any cards with the same name in your deck and play them instantly. ",
		placed: async (card) => {
			let i = card.name.indexOf('-');
			let cardName = i === -1 ?  card.name : card.name.substring(0, i);
			let pred = c => c.name.startsWith(cardName);
			let units = card.holder.hand.getCards(pred).map(x => [card.holder.hand, x])
			.concat(card.holder.deck.getCards(pred).map( x => [card.holder.deck, x] ) );
			if (units.length === 0)
				return;
			await card.animate("muster");
			await Promise.all( units.map( async p =>  await board.addCardToRow(p[1], p[1].row, p[1].holder, p[0])));
		}
	},
	spy: {
		name: "spy",
		description: `Place on your opponent's battlefield (counts towards your opponent's total) and draw ${spy.spy} cards from your deck. `,
		placed: async (card) => {
			await card.animate("spy");
			for (let i=0;i< spy.spy ;i++) {
				if (card.holder.deck.cards.length > 0)
					await card.holder.deck.draw(card.holder.hand);
			}
			card.holder = card.holder.opponent();
		}
	},
	sabotage: {
        name: "sabotage",
        description: `Send to enemy fields this cards to lower their score and draw extra ${spy.sabotage} card\(s\). `,
        placed: async (card) => {
            await card.animate("sab");
            for (let i=0;i< spy.sabotage ;i++) {
                if (card.holder.deck.cards.length > 0)
                    await card.holder.deck.draw(card.holder.hand);
            }
            card.holder = card.holder.opponent();
			//await resync_hands();
        }
    },
	resilience: {
	name: "Resilience",
	description: "Remains on the board for the following round. ",
	placed: async (card) => {
		game.roundEnd.push(async () => {

			card.noRemove = true;
			await card.animate("resilience");

	//		game.roundStart.push(async () => {
	//			delete card.noRemove;
	//			return true;
	//		});
		});
	}
},
	resilience_igni: {
	name: "Witcher Signs: Ignii",
	description: "Remains on the board for the following round. Adds +1 to all units in the row (excluding itself). Effects dont stacks",
	placed: async (card) => {
		game.roundEnd.push(async () => {

			card.noRemove = true;
			await card.animate("resilience");

	//		game.roundStart.push(async () => {
	//			delete card.noRemove;
	//			return true;
	//		}); it also dont work bruh
		});
	}
},
	aard: {
	name: "Witcher Signs: Aard",
	description: "Push all enemy units in the opposing row one row back toward Siege, ignoring shields. Playing this card will damage your total score! Hero and few other cards will ignore push (Internal Game Desing). ",
	placed: async (card, row) => {
		// Row this card was played on
	//	console.log("AARD PLAY", card, row)
		const myRow = row;
	//	console.log("AARD PLAY", card, board.getRow(card, "close", card.holder), board.getRow(card, "ranged", card.holder))

		let enemyRow;
		let targetRow;

		if (myRow === board.getRow(card, "close", card.holder)) {
			enemyRow = board.getRow(card, "close", card.holder.opponent());
			targetRow = board.getRow(card, "ranged", card.holder.opponent());
		} else if (myRow === board.getRow(card, "ranged", card.holder)) {
			enemyRow = board.getRow(card, "ranged", card.holder.opponent());
			targetRow = board.getRow(card, "siege", card.holder.opponent());
		} else {
			await board.toGrave(card, card.holder.hand);
			return;
		}

		const units = enemyRow.findCards(c => c.isUnit());

		if (units.length > 0) {
		//	await Promise.all(
			//	units.map(async c => await c.animate("knockback"))
		//	);


		await Promise.all(
				units.map(async c => {
					if (
						c.abilities.includes("reinforce") ||
						c.abilities.includes("muster") ||
						c.abilities.includes("medic") ||
						c.abilities.includes("sabotage") ||
						c.abilities.includes("spy") ||
						c.abilities.includes("gryffinSchool") ||
						c.abilities.includes("magicthegathering") ||
						c.abilities.includes("tgc_portal") ||
						c.abilities.includes("hero")
					) {
						console.log("AARD SKIPPED ", c, " becuase it had bad abilities")
					} else {
					//	await board.moveToNoEffects(c, targetRow, enemyRow); // not worky here
						// Move cards wich effects listed above
					//	await board.moveTo(c, targetRow, enemyRow);
					await c.animate("aard");
					await board.moveTo(c, targetRow, enemyRow);
					try {
					c.animate("knockback");
					} catch (e){

					}
					}
				})
			);
		}

	//	await board.toGrave(card, card.holder.hand);
	},
	weight: card => {
		const opponent = card.holder.opponent();

		const closeUnits = board
			.getRow(card, "close", opponent)
			.cards.filter(c => c.isUnit()).length;

		const rangedUnits = board
			.getRow(card, "ranged", opponent)
			.cards.filter(c => c.isUnit()).length;

		return Math.max(closeUnits, rangedUnits);
	}
},
	aid: {
    name: "Call to Arms",
    description: `Lets you and your opponent redraw ${spy.aid} cards. `,
    placed: async (card) => {
        await card.animate("aid");
		console.log("AID CARD PAYLOD", card, "by:", card.holder.id, "me id:", player_me.id);
		// await player_me.deck.draw(player_me.hand);

        if (player_me.deck.cards.length)
			for (let i=0;i< spy.aid ;i++) {
		console.log("me draw");
		try {
            await player_me.deck.draw(player_me.hand);
		} catch (e) {
			console.log("Is empty deck? got error", e);
		}
			}
        if (player_op.deck.cards.length)
			for (let i=0;i< spy.aid ;i++) {
		console.log("enemy draw");
		try {
            await player_op.deck.draw(player_op.hand);
		} catch (e) {
			console.log("Is empty deck? got error", e);
		}
			}
			if (card.holder.id === player_me.id) {
				console.log("is my card extra draw");
				try {
				await player_me.deck.draw(player_me.hand);
			} catch (e) {
			console.log("Is empty deck? got error", e);
		}
}
if (card.holder.id === player_op.id) {
				console.log("is not card extra draw");
				try {
				await player_op.deck.draw(player_op.hand);
				} catch (e) {
			console.log("Is empty deck? got error", e);
		}
}
        // card.holder = card.holder.opponent();
		//await resync_hands();
    }
},
	axii: {
	name: "witcher Signs",
	description: `This card use Witchers tricks to cast into enemy fields Axii sign. ${axii.desc}. `,
	placed: async (card) => {
		try {
			// Find axii card data by filename
			const targetData = Object.values(card_dict).find(c => c.filename === "axii");

			if (!targetData) {
				console.warn("Axii card not found in card_dict");
				return;
			}
			await card.animate("axii")
			// Create new card for opponent
			const opponent = card.holder.opponent();
			const spawned = new Card(targetData, opponent);

			// Add to opponent close row
			await board.addCardToRow(spawned, "close", opponent);
			

		} catch (e) {
			console.log("Axii ability error:", e);
		}
	}
},
	axii2_desc: {
		name: "Axii",
		description: `${axii.desc} `,
		placed: async card => await card.animate("debuff")
	},
	axii2_desc_playable: {
		name: "witcher Signs: Axii",
		description: `${axii.desc} `,
		placed: async (card) => {
			await card.animate("debuff");
			//for (let i=0;i< spy.spy ;i++) {
			//	if (card.holder.deck.cards.length > 0)
			//		await card.holder.deck.draw(card.holder.hand);
			//}
			card.holder = card.holder.opponent();
		}
	},
	gryffinSchool: {
	name: "Griffin School",
	description: "Choose one Witcher Sign card and add it to your hand. The card cannot be picked up with the Decoy once it has been placed! ",
	placed: async (card) => {
		let wrapper = { card: null };

		// Don't simulate opponent
		if (player_me.id !== card.holder.id) {
			card.animate(gryffinschool_conf.anim);
			console.log("Opponent played Gryffin School, waiting for sync.");
			return;
		}

		if (!witcher_signs || witcher_signs.length <= 0)
			return;

		// Create TEMP cards for preview carousel
		let previewCards = witcher_signs.map(sign => {
			return new Card(sign, card.holder);
		});

		let container = {
			cards: previewCards
		};

		await ui.queueCarousel(
			container,
			1,
			(c, i) => wrapper.card = c.cards[i],
			() => true,
			true,
			false,
			gryffinschool_conf.topic
		);

		let picked = wrapper.card;

		if (!picked)
			return;

		// Create REAL spawned copy
		let cardData = Object.values(card_dict)
	.find(c => c.filename === picked.filename);

if (!cardData)
	return;

let created = new Card(cardData, card.holder);

card.holder.hand.addCard(created);
created.animate(gryffinschool_conf.anim_hand);
card.animate(gryffinschool_conf.anim);
}
},
	magicthegathering: {
	name: "Conjunction of the Spheres",
	description: `Choose one card out of ${mtg_conf.random_max} random and add it to your hand. The card cannot be picked up with the Decoy once it has been placed! ${magicthegathering_stable}`,
	placed: async (card) => {
		let wrapper = { card: null };
				// Get cards directly from card_dict
		let filteredCards = Object.values(card_dict)
	.filter(c => {
		let strength = Number(c.strength);
		let count = Number(c.count);

		return (
			!isNaN(strength) &&
			!isNaN(count) &&

			count > mtg_conf.count_needed &&

			strength > mtg_conf.min_power &&
			strength < mtg_conf.max_power &&

			c.row !== "leader" //&&
			//c.deck !== "special" &&
			//c.deck !== "weather" &&	//Lets keep that

			//!c.witcher_sign &&
			//!c.token &&
			//!c.generated &&

			//!c.ability?.includes("hero")
		);
	});
	var seed_is = `${mtg_conf.daily_seed ? `${time_now_utc_to_b64()}` : ""}${mtg_conf.version}${turncount}${gameID}`
		// Don't simulate opponent
		if (player_me.id !== card.holder.id) {
			card.animate(mtg_conf.anim);
			console.log("Opponent played mtg, waiting for sync.");
			if (!mtg_conf.shuffle_few_times){
				console.log(`Op cards for this GameID and turn to pick from: `, shuffleSeeded(filteredCards, btoa(seed_is), `MTG ABILITY Seeded from ${seed_is}`).array.slice(0, mtg_conf.random_max), `\nMTG ABILITY Seeded from ${seed_is}`);
			}
			return;
		}

		// Shuffle multiple times
		if (mtg_conf.shuffle_few_times){
		for (let i = 0; i < 4; i++) {
			filteredCards.sort(() => Math.random() - 0.5);
		}
	}
		console.log("MTG CARDS ", filteredCards, " OR ", filteredCards.slice(0, mtg_conf.random_max));
		
		 var tmp_c = shuffleSeeded(filteredCards, btoa(seed_is), `MTG ABILITY Seeded from ${seed_is}`);
		 filteredCards = tmp_c.array;
		 tmp_c = null;
		 filteredCards = filteredCards.slice(0, mtg_conf.random_max);
		if (filteredCards.length <= 0)
			return;

		// Create TEMP cards for preview carousel
		let previewCards = filteredCards.map(data => {
			return new Card(data, card.holder);
		});

		let container = {
			cards: previewCards
		};

		await ui.queueCarousel(
			container,
			1,
			(c, i) => wrapper.card = c.cards[i],
			() => true,
			true,
			false,
			mtg_conf.topic
		);

		let picked = wrapper.card;

		if (!picked)
			return;

		// Create REAL spawned copy
		let cardData = Object.values(card_dict)
			.find(c => c.filename === picked.filename);

		if (!cardData)
			return;

		let created = new Card(cardData, card.holder);

		card.holder.hand.addCard(created);
		created.animate(mtg_conf.anim_hand);
		card.animate(mtg_conf.anim);
	}
},
	tgc_portal: {
	name: "That Game Company",
	description: `Choose one card out of max ${mtg_conf.random_max} Sky Faction cards and add it to your hand. The card cannot be picked up with the Decoy once it has been placed! ${magicthegathering_stable}`,
	placed: async (card) => {
		let wrapper = { card: null };
				// Get cards directly from card_dict
		let filteredCards = Object.values(card_dict)
	.filter(c => {
		let strength = Number(c.strength);
		let count = Number(c.count);

		return (
			!isNaN(strength) &&
			!isNaN(count) &&

			count > mtg_conf.count_needed &&

			strength > mtg_conf.min_power &&
			strength < mtg_conf.max_power &&

			c.row !== "leader" && c.deck === "sky" && c.ability !== "tgc_portal" //&&
			//c.deck !== "weather" &&	//Lets keep that

			//!c.witcher_sign &&
			//!c.token &&
			//!c.generated &&

			//!c.ability?.includes("hero")
		);
	});
	var seed_is = `${mtg_conf.daily_seed ? `${time_now_utc_to_b64()}` : ""}${mtg_conf.version}${turncount}${gameID}`
		// Don't simulate opponent
		if (player_me.id !== card.holder.id) {
			card.animate(mtg_conf.anim);
			console.log("Opponent played mtg, waiting for sync.");
			if (!mtg_conf.shuffle_few_times){
				console.log(`Op cards for this GameID and turn to pick from: `, shuffleSeeded(filteredCards, btoa(seed_is), `MTG ABILITY Seeded from ${seed_is}`).array.slice(0, mtg_conf.random_max), `\nMTG ABILITY Seeded from ${seed_is}`);
			}
			return;
		}

		// Shuffle multiple times
		if (mtg_conf.shuffle_few_times){
		for (let i = 0; i < 4; i++) {
			filteredCards.sort(() => Math.random() - 0.5);
		}
	}
		console.log("MTG CARDS ", filteredCards, " OR ", filteredCards.slice(0, mtg_conf.random_max));
		
		 var tmp_c = shuffleSeeded(filteredCards, btoa(seed_is), `MTG ABILITY Seeded from ${seed_is}`);
		 filteredCards = tmp_c.array;
		 tmp_c = null;
		 filteredCards = filteredCards.slice(0, mtg_conf.random_max);
		if (filteredCards.length <= 0)
			return;

		// Create TEMP cards for preview carousel
		let previewCards = filteredCards.map(data => {
			return new Card(data, card.holder);
		});

		let container = {
			cards: previewCards
		};

		await ui.queueCarousel(
			container,
			1,
			(c, i) => wrapper.card = c.cards[i],
			() => true,
			true,
			false,
			mtg_conf.topic
		);

		let picked = wrapper.card;

		if (!picked)
			return;

		// Create REAL spawned copy
		let cardData = Object.values(card_dict)
			.find(c => c.filename === picked.filename);

		if (!cardData)
			return;

		let created = new Card(cardData, card.holder);

		card.holder.hand.addCard(created);
		created.animate(mtg_conf.anim_hand);
		card.animate(mtg_conf.anim);
	}
},
	dopler: {
	name: "Doppler",
	description: "Send a shapeshifter to enemy fields that will will disguise itself as a strong card from the opponent's faction, so next round they can find a knife in their back",

	placed: async (card, row) => {
		try {

			card.animate2("dopler");

			// ====================================
// GET ENEMY FACTION
// ====================================

let enemyFaction = null;
let seed_real_id = "aaa";
if (player_me.id !== card.holder.id){
	enemyFaction = player_me.leader.faction
} else {
	enemyFaction =  player_op.leader.faction
}

console.log("[DOPLER] Enemy faction:", enemyFaction);

// ====================================
// FIND VALID TARGETS
// ====================================

let filteredCards = Object.values(card_dict).filter(c => {

	let strength = Number(c.strength);

	return (
		c.deck === enemyFaction &&
		!isNaN(strength) &&

		strength >= 7 &&
		strength <= 15 &&

		c.row !== "leader" && c.row !== "agile" &&

		!c.token &&
		!c.generated // &&

		// !c.ability?.includes("hero")
	);
});

// ====================================
// FALLBACK
// ====================================

if (!filteredCards.length) {

	console.warn("[DOPLER] No valid faction cards found, using fallback.");

	let fallback = Object.values(card_dict).find(
		c => c.filename === "leshen"
	);

	if (fallback)
		filteredCards = [fallback];
}

// ====================================
// SEEDED SHUFFLE
// ====================================

var seed_is =
	`${time_now_utc_to_b64()}${mtg_conf.version}${turncount}${gameID}${enemyFaction}${time_now_utc_to_b64()}`;

let shuffled = shuffleSeeded(
	filteredCards,
	btoa(seed_is),
	`dopler seeded from ${seed_is}`
).array;

// ====================================
// PICK TARGET
// ====================================

let picked = shuffled[0];

console.log("[DOPLER] Picked:", picked);
console.log("[DOPLER] Picked:", picked.name);

			// ====================================
			// CREATE NEW CARD COPY
			// ====================================

			let fakeData = structuredClone(picked);

			// keep Dopler identity
			fakeData.name = "Dopler";

			// keep copied artwork
			fakeData.filename = picked.filename;

			// hero + avenger
			fakeData.ability = "hero dopavenger";

			// custom avenger target
			// fakeData.avenger = "dopler_negative";

			// mark generated
			fakeData.is_dopler_generated = true;

			let spawned = new Card(
				fakeData,
				card.holder.opponent()
			);
			console.log("[DOPLER] spawned", fakeData, spawned);
			await sleep(1600);
			// ====================================
			// REMOVE ORIGINAL FOREVER
			// ====================================

			if (row)
				row.removeCard(card);

			// completely erase card
			card.removed = [];
			card.abilities = [];
			card.basePower = 0;
			card.power = 0;

			// ====================================
			// SPAWN COPY ON ENEMY FIELD
			// ====================================

			await board.addCardToRow(
				spawned,
				picked.row,
				card.holder.opponent()
			);

			await spawned.animate("dopavenger");

		} catch(e) {
			console.log("[DOPLER ERROR]", e);
		}
	},

	weight: () => 40
},
	reinforce: {
	name: "Reinforce",
	description: "Summons additional cards to board, summoned cards dont need to be in hand or deck. Cant be pick up after being placed. ",

	placed: async (card) => {
		var tasks = [];
		try {
			card.animate("muster2");
			console.log("[REINFORCE] running for:", card.name);

			const targets = findReinforceTargets(card.name);

			if (!targets || targets.length === 0) {
				console.warn("[REINFORCE] No reinforce targets for:", card.name);
				return;
			}

			for (const targetData of targets) {

				let spawnCount = Number(targetData.reinforce?.spawn_count || 1);

				for (let i = 0; i < spawnCount; i++) {
					tasks.push((async () => {
					let spawned = new Card(targetData, card.holder);

					console.log("[REINFORCE] spawning:", targetData.name);

					await board.addCardToRow(
						spawned,
						targetData.row,
						card.holder
					);
					await sleep(3);
					await spawned.animate("reinforce");
					})());
				}
				await Promise.all(tasks); // if cards x, card y ....
			}
			//await Promise.all(tasks); // if all cards at once

		} catch (e) {
			console.log("[REINFORCE ERROR]", e);
		}
	},

	weight: () => 35
},
	medic: {
		name: "medic",
		description: "Choose one card from your discard pile and play it instantly (no Heroes or Special Cards). ",
		placed: async (card) => {
			let grave = board.getRow(card, "grave", card.holder);
			let units = card.holder.grave.findCards(c => c.isUnit());
			if (units.length <= 0)
				return;
			let wrapper = {card : null};
			
			if (game.randomRespawn) {
			// Edit by Rick: Previously if game.randomRespawn is true (Nilfgaard leader card) it would pick a random card to revive.
			// This random card differed per client so would cause a massive desync.
			// I changed it to instead search for the HIGHEST valued card, and in the case of multiple cards with that value base it on filename.
			// Very arbitrary but looks random enough.
			// Could argue that this leader card's "sabotaging" nature should make it pick the LOWEST valued card instead but I think that makes it too easy to sabotage yourself.
			// OLD: wrapper.card = grave.findCardsRandom(c => c.isUnit())[0];
				units.sort((a, b) => {
					const powerDiff = b.basePower - a.basePower;
					if (powerDiff !== 0) return powerDiff;
					return a.filename.localeCompare(b.filename);	// Fallback, if points are tied then use filename as a tiebreaker.
				});
				wrapper.card = units[0];
			
			} else if (card.holder.controller instanceof ControllerOpponent) {
				console.log("Opponent has played a medic, wait for him to chose which card to respawn")
				// Wait for the opponent to choose which card to revive
				wrapper.card = await new Promise((resolve) => {
					const handleMessage = async (event) => {
						console.log("PING, medic draw op?", event, await recv_and_decomp(event));
						const data = await recv_and_decomp(event);
						if (data.type === "medicDraw") {
							const drawnCard = grave.cards.filter(c => c.filename === data.card)[0]
							if (drawnCard) {
								resolve(drawnCard);
								return;
							}
						}
					}
					
					socket.addEventListener('message', handleMessage);
					
				});
			} else
				await ui.queueCarousel(card.holder.grave, 1, (c, i) => wrapper.card=c.cards[i], c => c.isUnit(), true);
			let res = wrapper.card;
			grave.removeCard(res);
			grave.addCard(res);
			await res.animate("medic");
			await res.autoplay(grave);
			return
		}
	},
	morale: {
		name: "Morale",
		description: "Adds +1 to all units in the row (excluding itself). ",
		placed: async card => await card.animate("morale")
	},
	powergain: {
		name: "Power Gain",
		description: powergain.desc,
		placed: async card => await card.animate("powergain")
	},
	bond: {
		name: "Tight Bond",
		description: "Place next to a card with the same name to double the strength of both cards. ",
		placed: async card => {
			let bonds = board.getRow(card, card.row, card.holder).findCards(c => c.name === card.name);
			if (bonds.length > 1)
				await Promise.all( bonds.map(c => c.animate("bond")) );
		}
	},
	avenger: {
		name: "Avenger",
		description: "When this card is removed from the battlefield, it summons a powerful new Unit Card to take its place. ",
		removed: async card => {
		try {
			console.log("Avenger script running");

			const targetData = findAvengerTarget(card.name);

			if (!targetData) {
				console.warn("No avenger target found for:", card.name);
				return;
			}

			let bdf = new Card(targetData, card.holder);
			console.log("AVENGER bdf/target data", bdf, targetData)

			bdf.removed.push(() =>
				setTimeout(() => bdf.holder.grave.removeCard(bdf), 1001)
			);

			await board.addCardToRow(bdf, targetData.row, card.holder);
			await bdf.animate("avenger_spawn_creature");

		} catch (e) {
			console.log(e);
		}
	},
	weight: () => 50
	},
	dopavenger: {
		name: "Doppler",
		description: "When this card is removed from the battlefield, it summons a powerful new Unit Card to take its place. ",
		removed: async card => {
		try {
			console.log("Avenger script running");

			const targetData = findAvengerTarget(card.name);

			if (!targetData) {
				console.warn("No avenger target found for:", card.name);
				return;
			}

			let bdf = new Card(targetData, card.holder);
			console.log("AVENGER bdf/target data", bdf, targetData)

			bdf.removed.push(() =>
				setTimeout(() => bdf.holder.grave.removeCard(bdf), 1001)
			);

			await board.addCardToRow(bdf, targetData.row, card.holder);
			await bdf.animate("dopler_spawn_creature");

		} catch (e) {
			console.log(e);
		}
	},
	weight: () => 50
	},
//	avenger_kambi: {
//		name: "Avenger",
//		description: "When this card is removed from the battlefield, it summons a powerful new Unit Card to take its place. ",
//		removed: async card => {
//			try {
//			console.log("kambi")
//			let bdf = new Card(card_dict[197], card.holder);
	//		bdf.removed.push( () => setTimeout( () => bdf.holder.grave.removeCard(bdf), 1001) );
//			await board.addCardToRow(bdf, "close", card.holder);
//			} catch (e) {
//				console.log(e);
//			}
//		},
	//	weight: () => 50
	//},
	avenger_kambi: {
	name: "Avenger",
	description: "When this card is removed from the battlefield, it summons a powerful new Unit Card to take its place.",
	removed: async card => {
		try {
			console.log("kambi");

			const targetData = findAvengerTarget(card.name);

			if (!targetData) {
				console.warn("No avenger target found for:", card.name);
				return;
			}

			let bdf = new Card(targetData, card.holder);

			bdf.removed.push(() =>
				setTimeout(() => bdf.holder.grave.removeCard(bdf), 1001)
			);

			await board.addCardToRow(bdf, "close", card.holder);

		} catch (e) {
			console.log(e);
		}
	},
	weight: () => 50
},
	foltest_king: {
		description: "Pick an Impenetrable Fog card from your deck and play it instantly.",
		activated: async card => {
			let out = card.holder.deck.findCard(c => c.name === "Impenetrable Fog");
			if (out)
				await out.autoplay(card.holder.deck);
		},
		weight: (card, ai) => ai.weightWeatherFromDeck(card, "fog")
	},
	foltest_lord: {
		description: "Clear any weather effects (resulting from Biting Frost, Torrential Rain or Impenetrable Fog cards) in play.",
		activated: async () => {
			tocar("clear", false);
			await weather.clearWeather();
		},
		weight: (card, ai) =>  ai.weightCard( {row:"weather", name:"Clear Weather"} )
	},
	foltest_siegemaster: {
		description: "Doubles the strength of all your Siege units (unless a Commander's Horn is also present on that row).",
		activated: async card => await board.getRow(card, "siege", card.holder).leaderHorn(),
		weight: (card, ai) => ai.weightHornRow(card, board.getRow(card, "siege", card.holder))
	},
	foltest_steelforged: {
		description: "Destroy your enemy's strongest Siege unit(s) if the combined strength of all his or her Siege units is 10 or more.",
		activated: async card => await ability_dict["scorch_s"].placed(card),
		weight: (card, ai, max) => ai.weightScorchRow(card, max, "siege")
	},
	foltest_son: {
		description: "Destroy your enemy's strongest Ranged Combat unit(s) if the combined strength of all his or her Ranged Combat units is 10 or more.",
		activated: async card => await ability_dict["scorch_r"].placed(card),
		weight: (card, ai, max) => ai.weightScorchRow(card, max, "ranged")
	},
	emhyr_imperial: {
		description: "Pick a Torrential Rain card from your deck and play it instantly.",
		activated: async card => {
			let out = card.holder.deck.findCard(c => c.name === "Torrential Rain");
			if (out)
				await out.autoplay(card.holder.deck);
		},
		weight: (card, ai) => ai.weightWeatherFromDeck(card, "rain")
	},
	nilf_drawmaster: {
	description: `On use, if your hand has fewer than ${nilfard_drawmaster.handshort} cards, draw ${nilfard_drawmaster.drawalive} cards from your deck, plus 1 additional card for each unit in your graveyard (up to ${nilfard_drawmaster.drawdead} bonus cards). You start the game with ${nilfard_drawmaster.cardban} fewer cards in hand but you can on game start redraw extra ${nilfard_drawmaster.drawextra} card(s).`,
	activated:  async (card) => {
	console.log("nilf_drawmaster");

	let player = card.holder;

	// Stop if hand already big enough
	if (player.hand.cards.length >= nilfard_drawmaster.handshort)
		return;

	let grave = player_me.grave;
	let deck = player_me.deck;

	console.log("grave and deck", grave, deck);

	let graveUnits = grave.findCards(c => c.isUnit());

	// How many bonus draws we get from "dead"
	let bonusDraws = Math.min(
		graveUnits.length,
		nilfard_drawmaster.drawdead
	);

	// Total draws = base + bonus from grave
	let totalDraws = nilfard_drawmaster.drawalive + bonusDraws;

	console.log("Drawing:", totalDraws, "(base:", nilfard_drawmaster.drawalive, "+ bonus:", bonusDraws, ")");

	// Draw everything from deck
	for (let i = 0; i < totalDraws; i++) {
		if (deck.cards.length > 0)
			await deck.draw(player.hand);
	}


	

}
},	
	darkness_storm_leader: {
	description: "Spawn Darkness Storm on both sides that destroys all non-hero cards in the close row",
	activated: async (card) => {

		// Find the card data in card_dict
		const targetData = Object.values(card_dict).find(
			c => c.filename === "darkstorm"
		);

		if (!targetData) {
			console.warn("Darkness Storm card not found");
			return;
		}

		// Create cards from thin air
		const myStorm = new Card(targetData, player_me);
		const opStorm = new Card(targetData, player_op);

		// Spawn onto close rows
		await Promise.all([
			board.addCardToRow(myStorm, "close", player_me),
			board.addCardToRow(opStorm, "close", player_op)
		]);
		await ui.notification("darkstorm", ui_display_times.faction_ability);
	}
},
	gaunter_neutral_leader: {
		description: `On use both sides will gain an additional (${gaunter_lider.revive * 100}%+1)  of the number of cards in the thier grave as additional cards from deck and all players start the game with ${gaunter_lider.extra_cards * 100}% more cards in their hand (based on their starting number)`,
	activated: async (card) => {
    const me = player_me;
    const op = player_op;

    const myDraws = Math.floor(me.grave.cards.length * gaunter_lider.revive + 1);
    const opDraws = Math.floor(op.grave.cards.length * gaunter_lider.revive + 1);
		await ui.notification("gaunter", ui_display_times.faction_ability);
    for (let i = 0; i < myDraws; i++)
        if (me.deck.cards.length)
            await me.deck.draw(me.hand);

    for (let i = 0; i < opDraws; i++)
        if (op.deck.cards.length)
            await op.deck.draw(op.hand);

    await Promise.resolve();
}
	},
	emhyr_emperor: {
		description: "Look at 3 random cards from your opponent's hand.",
		activated: async card => {
			// Wait for the opponent to close the carousel
			if (card.holder.controller instanceof ControllerOpponent) {
				await new Promise((resolve) => {
					const handleMessage = async (event) => {
						const data = await recv_and_decomp(event);
						if (data.type === "containerClosed") {
								resolve(true);
						}
					}
					socket.addEventListener('message', handleMessage);
				});
				
				return
			}
			let container = new CardContainer();
			container.cards = card.holder.opponent().hand.findCardsRandom(() => true, 3);
			Carousel.curr.cancel();
			await ui.viewCardsInContainer(container);
		},
		weight: card => {
			let count = card.holder.opponent().hand.cards.length;
			return count === 0 ? 0 : Math.max(10, 10 * (8 - count));
		}
	},
	emhyr_whiteflame: {
		description: "Cancel your opponent's Leader Ability."
	},
	emhyr_relentless: {
		description: "Draw a card from your opponent's discard pile.",
		activated: async card => {
			let grave = board.getRow(card, "grave", card.holder.opponent());
			if (grave.findCards(c => c.isUnit()).length === 0)
				return;
			
			if (card.holder.controller instanceof ControllerOpponent) {
				const newCard = await new Promise((resolve) => {
					const handleMessage = async (event) => {
						const data = await recv_and_decomp(event);

						if (data.type === "addCardHand") {
							// Edit by Rick: Previously this would try to choose the card based on replicated index.
							// But it looks like the array order isn't synchronized so now using filename instead.
							// OLD: const drawnCard = grave.cards.filter(c => c.isUnit())[data.index]
							const drawnCard = grave.cards.filter(c => c.filename === data.card)[0]
							
							if (drawnCard) {
								drawnCard.holder = player_op;
								resolve(drawnCard);
							}
						}
					}
					socket.addEventListener('message', handleMessage);
				});
				newCard.holder = player_op;
				board.toHand(newCard, grave);
				return;
			}

			Carousel.curr.cancel();
			await ui.queueCarousel(grave, 1, (c,i) => {
				let newCard = c.cards[i];
				newCard.holder = card.holder;
				board.toHand(newCard, grave);

				// Edit by Rick: Adding a line here to actually return the card object, otherwise the gwent.js edit can't read filename.
				return newCard;
			}, c => c.isUnit(), true);
		},
		weight: (card, ai, max, data) => ai.weightMedic(data, 0, card.holder.opponent())
	},
	emhyr_invader: {
		// Edit by Rick: Modified to explain the altered effect that doesn't cause desyncs.
		// OLD: description: "Medics cannot choose which card to revive and draw a random one from the graveyard (affects both players).",
		description: "Medics cannot choose which card to revive and draw the strongest one from the graveyard (affects both players).",
		gameStart: () => game.randomRespawn = true
	},
	eredin_commander: {
		description: "Double the strength of all your Close Combat units (unless a Commander's horn is 	also present on that row).",
		activated: async card => await board.getRow(card, "close", card.holder).leaderHorn(),
		weight: (card, ai) => ai.weightHornRow(card, board.getRow(card, "close", card.holder))
	},
	eredin_bringer_of_death: {
		name: "Eredin : Bringer of Death",
		description: "Restore a card from your discard pile to your hand.",
		activated: async card => {
			if (!card.holder.grave.cards.length) {
				card.holder.tag === "me" ? player_me.endRound() : player_op.endRound()
				return
			}
			
			let newCard;
			if (card.holder.controller instanceof ControllerOpponent) {
				newCard = await new Promise((resolve) => {
					const handleMessage = async (event) => {
						const data = await recv_and_decomp(event);

						if (data.type === "containerClosed") {
						//	const drawnCard = player_op.grave.cards.filter(c => c.isUnit() && c.filename === data.card)[0]
						//	if (drawnCard) {
						//		resolve(drawnCard);
						//	}
						//player_op.hand.cards.push({});
						var op_counter = document.getElementById("hand-count-op");
op_counter.innerHTML = player_op.hand.cards.length
resolve(player_op.grave.cards[0]);
						}
					}
					socket.addEventListener('message', handleMessage);
				});
			} else {
				Carousel.curr.exit();
				await ui.queueCarousel(card.holder.grave, 1, (c,i) => newCard = c.cards[i], c => c.isUnit(), false, false);
			}
			if (newCard)
				await board.toHand(newCard, card.holder.grave);
		},
		weight: (card, ai, max, data) => ai.weightMedic(data, 0, card.holder)
	},
	eredin_destroyer: {
	description: "Banish 2 cards from your hand and create a copy of a card from your deck.",

	activated: async (card) => {
		let hand = board.getRow(card, "hand", card.holder);
		let deck = player_me.deck;

		console.log("[EREDIN_DESTROYER] Ability activated.");

		// Don't simulate opponent
		if (player_me.id !== card.holder.id) {
			console.log("[EREDIN_DESTROYER] Opponent played card, waiting for sync.");
			return;
		}

		if (Carousel.curr)
			Carousel.curr.exit();

		// =========================
		// BANISH CARD 1
		// =========================
		console.log("[EREDIN_DESTROYER] Choosing first card to banish.", hand);

		await ui.queueCarousel(
			hand,
			1,
			(c, i) => {
				let removed = c.cards[i];

				console.log(
					"[EREDIN_DESTROYER] Banishing card 1:",
					removed.name || removed.filename
				);

				// Permanently remove card
				c.removeCard(removed);

				if (Carousel.curr)
					Carousel.curr.update();

				return removed;
			},
			() => true,
			false,
			false,
			"Choose card to banish (1/2)"
		);

		await new Promise(r => setTimeout(r, 300));

		// =========================
		// BANISH CARD 2
		// =========================
		console.log("[EREDIN_DESTROYER] Choosing second card to banish.", hand);

		await ui.queueCarousel(
			hand,
			1,
			(c, i) => {
				let removed = c.cards[i];

				console.log(
					"[EREDIN_DESTROYER] Banishing card 2:",
					removed.name || removed.filename
				);

				// Permanently remove card
				c.removeCard(removed);

				if (Carousel.curr)
					Carousel.curr.update();

				return removed;
			},
			() => true,
			false,
			false,
			"Choose card to banish (2/2)"
		);

		await new Promise(r => setTimeout(r, 300));

		// =========================
		// CHOOSE CARD TO COPY
		// =========================
		console.log("[EREDIN_DESTROYER] Choosing card from deck to copy.", deck);

		let wrapper = { card: null };

		await ui.queueCarousel(
			deck,
			1,
			(c, i) => {
				wrapper.card = c.cards[i];

				console.log(
					"[EREDIN_DESTROYER] Selected deck card:",
					wrapper.card.name || wrapper.card.filename
				);

				return c.cards[i];
			},
			() => true,
			true,
			false,
			"Choose a card to create a copy of"
		);

		if (!wrapper.card) {
			console.log("[EREDIN_DESTROYER] No card selected.");
			return;
		}

		// =========================
		// CREATE COPY
		// =========================
		let copiedData = Object.values(card_dict)
			.find(cd => cd.filename === wrapper.card.filename);

		if (!copiedData) {
			console.log(
				"[EREDIN_DESTROYER] Failed to find card data for:",
				wrapper.card.filename
			);
			return;
		}

		let created = new Card(copiedData, card.holder);

		console.log(
			"[EREDIN_DESTROYER] Creating copy:",
			created.name || created.filename
		);

		card.holder.hand.addCard(created);


		console.log("[EREDIN_DESTROYER] Ability finished.");
	},

	weight: (card, ai) => {
		let cards = ai.discardOrder(card)
			.splice(0, 2)
			.filter(c => c.basePower < 7);

		if (cards.length < 2)
			return 0;

		return 30;
	}
},
	eredin_king: {
		description: "Pick any weather card from your deck and play it instantly.",
		activated: async card => {
			let deck = board.getRow(card, "deck", card.holder);

			// Wait for the opponent to choose which weather card to play
			if (card.holder.controller instanceof ControllerOpponent) {
				const card = await new Promise((resolve) => {
					const handleMessage = async (event) => {
						const data = await recv_and_decomp(event);
						if (data.type === "weatherDraw") {
							const drawnCard = deck.cards.filter(c => c.faction === "weather" && c.filename === data.card)[0]
							if (drawnCard) {
								resolve(drawnCard);
							}
						}
					}
					socket.addEventListener('message', handleMessage);
				});
				board.toWeather(card, deck);
			} else {
				Carousel.curr.cancel();
				await ui.queueCarousel(deck, 1, (c,i) => board.toWeather(c.cards[i], deck), c => c.faction === "weather", true);
			}
		},
		weight: (card, ai, max) => ability_dict["eredin_king"].helper(card).weight,
		helper: card => {
			let weather = card.holder.deck.cards.filter(c => c.row === "weather").reduce((a,c) =>a.map(c => c.name).includes(c.name) ? a : a.concat([c]), [] );
			
			let out, weight = -1;
			weather.forEach( c => {
				let w = card.holder.controller.weightWeatherFromDeck(c, c.abilities[0]);
				if (w > weight) {
					weight = w;
					out = c;
				}
			});
			return {card: out, weight: weight};
		}			
	},
	eredin_treacherous: {
		description: "Doubles the strength of all spy cards (affects both players).",
		gameStart: () => game.doubleSpyPower = true
	},
	francesca_queen: {
		description: "Destroy your enemy's strongest Close Combat unit(s) if the combined strength of all his or her Close Combat units is 10 or more.",
		activated: async card => await ability_dict["scorch_c"].placed(card),
		weight: (card, ai, max) => ai.weightScorchRow(card, max, "close")
	},
	francesca_beautiful: {
		description: "Doubles the strength of all your Ranged Combat units (unless a Commander's Horn is also present on that row).",
		activated: async card => await board.getRow(card, "ranged", card.holder).leaderHorn(),
		weight: (card, ai) => ai.weightHornRow(card, board.getRow(card, "ranged", card.holder))
	},
	francesca_daisy: {
		description: "Draw an extra card at the beginning of the battle.",
		placed: card => game.gameStart.push( () => {
			let draw = card.holder.deck.removeCard(0);
			card.holder.hand.addCard( draw );
			return true;
		})
	},
	francesca_pureblood: {
		description: "Pick a Biting Frost card from your deck and play it instantly.",
		activated: async card => {
			let out = card.holder.deck.findCard(c => c.name === "Biting Frost");
			if (out)
				await out.autoplay(card.holder.deck);
		},
		weight: (card, ai) => ai.weightWeatherFromDeck(card, "frost")
	},
	francesca_hope: {
		description: "Move agile units to whichever valid row maximizes their strength (don't move units already in optimal row).",
		activated: async card => {
			let close = board.getRow(card, "close");
			let ranged =  board.getRow(card, "ranged");
			let cards = ability_dict["francesca_hope"].helper(card);
			await Promise.all(cards.map(async p => await board.moveTo(p.card, p.row === close ? ranged : close, p.row) ) );
			
		},
		weight: card => {
			let cards = ability_dict["francesca_hope"].helper(card);
			return cards.reduce((a,c) => a + c.weight, 0);
		},
		helper: card => {
			let close = board.getRow(card, "close");
			let ranged =  board.getRow(card, "ranged");
			return validCards(close).concat( validCards(ranged) );
			function validCards(cont) {
				return cont.findCards(c => c.row === "agile").filter(c => dif(c,cont) > 0).map(c => ({card:c, row:cont, weight:dif(c,cont)}))
			}
			function dif(card, source) {
				return (source === close ? ranged : close).calcCardScore(card) - card.power;
			}
		}
	},
	crach_an_craite: {
		description: "Shuffle all cards from each player's graveyard back into their decks.",
		activated: async card => {
			// Edit by Rick: Everything below is new.
			// Previous version let both clients individually add the cards back to the deck at random positions. Problematic as then the next deck draw (e.g. Spy cards) will draw a different card per client.
			// This would be subject to desyncs to matter the below board.toDeck() implementation as decks are specifically implemented via overrides in gwent.js to always add new cards at a random index.
			// Secondly, graveyard order is inconsistent between clients so even if these cards are returned to the bottom of the deck you run the risk of *eventually* drawing these inconsistently ordered cards.
			// First I tried fixing this with sockets (both clients run the visual logic but afterwards the OP dictates both players' new decks similar to the start of the round after card redraw is implemented).
			// Had some input await issues there so plan B (current) is to just sort the graveyards and then append them to the end of each player's deck.
			// OLD: Promise.all(card.holder.grave.cards.map(c => board.toDeck(c, card.holder.grave)));
			// OLD: await Promise.all(card.holder.opponent().grave.cards.map(c => board.toDeck(c, card.holder.opponent().grave)));
			
			// Deterministic: sort grave cards by filename so both clients iterate same order.
			const meGraveSorted = [...card.holder.grave.cards].sort((a,b) => (a.filename || "").localeCompare(b.filename || ""));
			const opGraveSorted = [...card.holder.opponent().grave.cards].sort((a,b) => (a.filename || "").localeCompare(b.filename || ""));

			// Helper to move a card visually then deterministically append to bottom of the deck.
			const moveToDeckBottom = async (c, holder) => {
				const source = holder.grave;
				const deck = holder.deck;

				// Run the existing translateTo visual step (same as moveTo does).
				// moveTo used 'await translateTo(...)' in gwent.js — translateTo is synchronous-ish but awaiting is harmless.
				await translateTo(c, source, deck);

				// Remove the card from the source container (updates arrays + DOM).
				// This mirrors what moveTo did (source.removeCard(card)).
				source.removeCard(c);

				// Keep card metadata consistent.
				c.holder = holder;

				// Append to the bottom of the deck array deterministically.
				deck.cards.push(c);

				// Ensure visual representation matches the deck array (use existing deck helpers).
				deck.addCardElement();
				deck.resize();
			};

			// Move all my grave cards to bottom (deterministic order).
			for (const c of meGraveSorted) {
				await moveToDeckBottom(c, card.holder);
			}

			// Move all opponent grave cards to bottom (deterministic order).
			console.log("opGraveSorted", opGraveSorted);
			for (const c of opGraveSorted) {
			 await moveToDeckBottom(c, card.holder.opponent());
			}

			// Tried shuffle but clients desynced
			//var start = player_me.deck.cards
			///player_me.deck.cards = shuffleSeeded(player_me.deck.cards, `${Math.random().toString(36).substring(2, 36)}${player_me.ThatPlayerId}_-_-_${JSON.stringify(serializeCards(player_me.deck.cards))}`).array
			//console.log("DECK SHUFFLED?", "me", start !== player_me.deck.cards, "Was", serializeCards(start), "is", serializeCards(player_me.deck.cards))
			// Looks like this dont work:
			// var start2 = player_op.deck.cards
			// player_op.deck.cards = shuffleSeeded(player_op.deck.cards, `${JSON.stringify(serializeCards(player_op.deck.cards))}`).array
			// console.log("DECK SHUFFLED?", "op", start2 !== player_op.deck.cards, "Was", serializeCards(start2), "is", serializeCards(player_op.deck.cards))

			// Small async yield so any pending UI/handlers can process; not a hack, just a safe tick.
			await Promise.resolve();
		},
		weight: (card, ai, max, data) => {
			if( game.roundCount < 2)
				return 0;
			let medics = card.holder.hand.findCard(c => c.abilities.includes("medic"));
			if (medics !== undefined)
				return 0;
			let spies = card.holder.hand.findCard(c => c.abilities.includes("spy"));
			if (spies !== undefined)
				return 0;
			if (card.holder.hand.findCard(c => c.abilities.includes("decoy")) !== undefined && (data.medic.length || data.spy.length && card.holder.deck.findCard(c => c.abilities.includes("medic")) !== undefined) )
				return 0;
			return 15;
		}
	},
	king_bran: {
		description: "Units only lose half their Strength in bad weather conditions.",
		placed: card => board.row.filter((c,i) => card.holder === player_me ^ i<3).forEach(r => r.halfWeather = true)
	},
	eist_tuirseach: {
		description: "Pick a Skellige Storm card from your deck and play it instantly.",
		activated: async card => {
			let out = card.holder.deck.findCard(c => c.name === "Skellige Storm");
			if (out)
				await out.autoplay(card.holder.deck);
		},
		weight: (card, ai) => ai.weightWeatherFromDeck(card, "rain")
	},
	skellige_berserk_reward: {
    description: "Spawn a Mardroeme card in the row with the most Berserkers.",
	activated: async card => {

        let rows = [
            board.getRow(card, "close", card.holder),
            board.getRow(card, "ranged", card.holder),
            board.getRow(card, "siege", card.holder)
        ];

        let bestRow = null;
        let bestCount = 0;

        for (let row of rows) {

            let count = row.findCards(
                c => c.abilities?.includes("berserker")
            ).length;

            if (count > bestCount) {
                bestCount = count;
                bestRow = row;
            }
        }

        if (!bestRow || bestCount === 0)
            return;
        // placeholder card
        let targetData = Object.values(card_dict)
            .find(c => c.filename === "svalblod_change");

        if (!targetData)
            return;
		if (board.getRow(card, "ranged", card.holder) === bestRow){
		targetData.row = "ranged"
		} else if (board.getRow(card, "siege", card.holder) === bestRow){
			targetData.row = "siege"
		} else {
		targetData.row = "close"
		}
		// console.log("BEST ROW", bestRow, targetData, targetData.row);
        let spawned = new Card(targetData, card.holder);

        bestRow.addCard(spawned);
        spawned.animate("reinforce");
    }
},
skellige_bond_summoner: {
    description:
        `Banish a card with power greater than or equal to ${skellige_bond_conf.power}. Then create a Tight Bond card from your faction or Neutral and add it to your hand.`,

    activated: async (card) => {

        console.log(
            "[SKELLIGE_BOND_SUMMONER]",
            player_me.id,
            card.holder.id
        );

        if (player_me.id !== card.holder.id)
            return;

        let hand = card.holder.hand;

        let discardable = hand.findCards(
            c => c.basePower > skellige_bond_conf.power
        );

        if (!discardable.length) {
        //    showTooltip("You lack valid cards to banish");
            return;
        }

        if (Carousel.curr)
            Carousel.curr.exit();

        // =========================
        // CHOOSE CARD TO BANISH
        // =========================

        let banished = null;

        await ui.queueCarousel(
            hand,
            1,
            (c, i) => {

                banished = c.cards[i];

                console.log(
                    "[SKELLIGE_BOND_SUMMONER] Banishing:",
                    banished.name || banished.filename
                );

                // One-way ticket to hell
                c.removeCard(banished);

                if (Carousel.curr)
                    Carousel.curr.update();

                return banished;
            },
            candidate => (
                candidate.basePower >= skellige_bond_conf.power
            ),
            false,
            false,
            "Choose card to banish"
        );

        if (!banished)
            return;

        await new Promise(r => setTimeout(r, 300));

        // =========================
        // FIND BOND TARGETS
        // =========================

        let faction = card.holder.leader.faction;

        let bondCards = Object.values(card_dict).filter(cd => {

            let abilities =
                typeof cd.ability === "string"
                    ? cd.ability.split(" ")
                    : [];

            return (
                abilities.includes("bond") &&
                (
                    cd.deck === faction || cd.deck === "neutral"
                ) &&
                !cd.token &&
                !cd.generated
            );
        });

        if (!bondCards.length) {
            console.log(
                "[SKELLIGE_BOND_SUMMONER] No valid Tight Bond cards found."
            );
            return;
        }

        // =========================
        // CHOOSE CARD TO CREATE
        // =========================

        let wrapper = { card: null };

        let preview = bondCards.map(
            data => new Card(data, card.holder)
        );

        await ui.queueCarousel(
            { cards: preview },
            1,
            (c, i) => {

                wrapper.card = c.cards[i];

                console.log(
                    "[SKELLIGE_BOND_SUMMONER] Selected:",
                    wrapper.card.name || wrapper.card.filename
                );

                return wrapper.card;
            },
            () => true,
            true,
            false,
            "Choose Tight Bond card"
        );

        if (!wrapper.card)
            return;

        // =========================
        // CREATE COPY
        // =========================

        let cardData = Object.values(card_dict)
            .find(cd => cd.filename === wrapper.card.filename);

        if (!cardData) {
            console.log(
                "[SKELLIGE_BOND_SUMMONER] Failed to find card data for:",
                wrapper.card.filename
            );
            return;
        }

        let created = new Card(cardData, card.holder);

        console.log(
            "[SKELLIGE_BOND_SUMMONER] Creating:",
            created.name || created.filename
        );

        card.holder.hand.addCard(created);

        await created.animate("reinforce");

        console.log(
            "[SKELLIGE_BOND_SUMMONER] Ability finished."
        );
    },

    weight: (card, ai) => {

        let valid = ai.hand.cards.filter(
            c => c.basePower > skellige_bond_conf.power
        );

        if (!valid.length)
            return 0;

        return 30;
    }
},
};

const ability_dict_base = deepClone(ability_dict);