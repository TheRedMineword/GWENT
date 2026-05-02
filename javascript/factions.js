"use strict"

var factions = {
	realms: {
		name: "Northern Realms",
		factionAbility: player => game.roundStart.push( async () => {
			if (game.roundCount > 1 && game.roundHistory[game.roundCount-2].winner === player) {
				player.deck.draw(player.hand);
				await ui.notification("north", ui_display_times.faction_ability);
			}
			return false;
		}),
		description: "Draw a card from your deck whenever you win a round."
	},
	nilfgaard: {
		name: "Nilfgaardian Empire",
		description: "Wins any round that ends in a draw."
	},
	monsters: {
		name: "Monsters",
		factionAbility: player => game.roundEnd.push( () => {
			let units = board.row.filter( (r,i) => player === player_me ^ i < 3)
				.reduce((a,r) => r.cards.filter(c => c.isUnit()).concat(a), []);
			
			if (units.length === 0)
				return;
			
			// Edit by Rick: Previously this would pick a random unit but that'll differ per client.
			// Easiest fix was to just have it always keep the strongest card (use filename in case of tie) instead of a random index.
			// OLD: let card = units[randomInt(units.length)];
			units.sort((a, b) => {
				const powerDiff = b.basePower - a.basePower;
				if (powerDiff !== 0) return powerDiff;
				return a.filename.localeCompare(b.filename);	// Fallback, if points are tied then use filename as a tiebreaker.
			});
			let card = units[0];
			
			card.noRemove = true;
			
			game.roundStart.push( async () => {
				await ui.notification("monsters", ui_display_times.faction_ability);
				delete card.noRemove;
				return true; 
			});
			return false;
		}),
		// OLD: description: "Keeps a random Unit Card out after each round."
		description: "Keeps the strongest Unit Card out after each round."
	},
	scoiatael: {
		name: "Scoia'tael",
		factionAbility: player => {

    // MATCH START ability (choose who goes first)
game.gameStart.push(async () => {
    console.log("[Scoiatael] gameStart triggered");

    if (player === player_me) {

        const hasSecondChance =
            player_me.leader &&
            player_me.leader.abilities &&
            player_me.leader.abilities.includes("scol_secondchance");

        const forceOpponentStart =
            hasSecondChance &&
            player_me.leader.abilities.includes("scol_secondchance.choose_who_starts") === false;
console.log("[Scoiatael] gameStart triggered", 'second chancing?', forceOpponentStart, hasSecondChance);
        if (forceOpponentStart) {
            console.log("[Scoiatael] Forcing opponent to start (Second Chance override)");

		game.firstPlayer = player.opponent();
		return true;

        } else {
            await ui.popup(
                "Go First",
                () => game.firstPlayer = player,
                "Let Opponent Start",
                () => game.firstPlayer = player.opponent(),
                "Would you like to go first?",
                "The Scoia'tael faction perk allows you to decide who will get to go first."
            );
        }

        comp_and_send(
            socket,
            JSON.stringify({
                type: "scoiataelStart",
                first: game.firstPlayer.tag
            })
        );
    }

    return true;
});

    // ROUND START ability (Second Chance)
    game.roundStart.push(async () => {
    console.log("[Scoiatael] roundStart triggered");
		try {
			console.log(scol_secondchance.lastwin, player.leader.abilities[0], game.roundCount, "lastwinner", scol_secondchance.lastwin);
			
    if (game.roundCount > 1 && scol_secondchance.lastwin.id === player.id && player.leader.abilities[0] === "scol_secondchance") {
        console.log("[Scoiatael] Second Chance activated, drawing");

        let grave = player.grave;
		console.log("Grave:", grave);
        let newCard = null;

        const valid = grave.cards.filter(c => c.isUnit());

        if (valid.length > 0) {
            const useRandom = scol_secondchance.roundstartreviverandom;
			console.log("[Scoiatael] second chance random?", useRandom);

            if (player.controller instanceof ControllerOpponent) {
                newCard = useRandom
                    ? valid[Math.floor(Math.random() * valid.length)]
                    : valid[0];
            } else {
                if (Carousel.curr) Carousel.curr.cancel();

                if (useRandom) {
                    newCard = valid[Math.floor(Math.random() * valid.length)];
                } else {
                    await ui.queueCarousel(
                        grave,
                        1,
                        (c, i) => newCard = c.cards[i],
                        c => c.isUnit(),
                        true
                    );
                }
            }
        }

        if (newCard) {
            await board.toHand(newCard, grave);
            await ui.notification(
                "scol_secondchance",
                ui_display_times.faction_ability
            );
        }
    }} catch (e) {
		console.log("[Scoiatael] roundStart triggered error;", e);
	}

    return false;
});

},
		description: "Decides who takes first turn."
	},
	skellige: {
		name: "Skellige",
		factionAbility: player => game.roundStart.push( async () => {
			if (game.roundCount != 3)
				return false;
			await ui.notification("skellige-" + player.tag, ui_display_times.faction_ability);

			// Edit by Rick: Previously this'd revive two random cards from the graveyard but the random selection was different per client.
			// Easiest fix is to have it behave the same way as the altered Medic ability when affected by a Nilfgaard leader card;
			// Find the two highest valued cards (and in the case of a tie, sort by filename), ensuring no chance for desyncs.
			// OLD: await Promise.all(player.grave.findCardsRandom(c => c.isUnit(), 2).map(c => board.toRow(c, player.grave)));
			const units = player.grave.cards.filter(c => c.isUnit());
			units.sort((a, b) => {
				const powerDiff = b.basePower - a.basePower;
				if (powerDiff !== 0) return powerDiff;
				return a.filename.localeCompare(b.filename);	// Fallback, if points are tied then use filename as a tiebreaker.
			});
			const chosen = units.slice(0, 2);
			await Promise.all(chosen.map(c => board.toRow(c, player.grave)));
			
			return true;
		}),
		// OLD: description: "2 random cards from the graveyard are placed on the battlefield at the start of the third round."
		description: "The strongest 2 cards from the graveyard are placed on the battlefield at the start of the third round."
	}
}
