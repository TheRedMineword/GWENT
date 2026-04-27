"use strict"

var factions = {
	realms: {
		name: "Northern Realms",
		factionAbility: player => game.roundStart.push( async () => {
			if (game.roundCount > 1 && game.roundHistory[game.roundCount-2].winner === player) {
				player.deck.draw(player.hand);
				await ui.notification("north", 1200);
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
				await ui.notification("monsters", 1200);
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
		factionAbility: player => game.gameStart.push( async () => {
			if (player === player_me) {
				await ui.popup("Go First", () => game.firstPlayer = player, "Let Opponent Start", () => game.firstPlayer = player.opponent(), "Would you like to go first?", "The Scoia'tael faction perk allows you to decide who will get to go first.");
				socket.send(JSON.stringify({ type: 'scoiataelStart', first: game.firstPlayer.tag }));
			}
			return true;
		}),
		description: "Decides who takes first turn."
	},
	skellige: {
		name: "Skellige",
		factionAbility: player => game.roundStart.push( async () => {
			if (game.roundCount != 3)
				return false;
			await ui.notification("skellige-" + player.tag, 1200);

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