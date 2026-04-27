"use strict"

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
		name: "hero",
		description: "Not affected by any Special Cards or abilities. "
	},
	decoy: {
		name: "Decoy",
		description: "Swap with a card on the battlefield to return it to your hand. "
	},
	horn: {
		name: "Commander's Horn",
		description: "Doubles the strength of all unit cards in that row. Limited to 1 per row. ",
		placed: async card => await card.animate("horn")
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
		description: "Transforms into a bear when a Mardroeme card is on its row. ",
		placed: async (card, row) => {
			if (row.effects.mardroeme === 0)
				return;
			row.removeCard(card);
			let cardId = card.name.indexOf("Young") === -1 ? 206 : 207;
			await row.addCard(new Card(card_dict[cardId], card.holder));
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
		description: "Place on your opponent's battlefield (counts towards your opponent's total) and draw 2 cards from your deck. ",
		placed: async (card) => {
			await card.animate("spy");
			for (let i=0;i<2;i++) {
				if (card.holder.deck.cards.length > 0)
					await card.holder.deck.draw(card.holder.hand);
			}
			card.holder = card.holder.opponent();
		}
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
						const data = JSON.parse(event.data);
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
		removed: async (card) => {
			let bdf = new Card(card_dict[21], card.holder);
			bdf.removed.push( () => setTimeout( () => bdf.holder.grave.removeCard(bdf), 1001) );
			await board.addCardToRow(bdf, "close", card.holder);
		},
		weight: () => 50
	},
	avenger_kambi: {
		name: "Avenger",
		description: "When this card is removed from the battlefield, it summons a powerful new Unit Card to take its place. ",
		removed: async card => {
			let bdf = new Card(card_dict[196], card.holder);
			bdf.removed.push( () => setTimeout( () => bdf.holder.grave.removeCard(bdf), 1001) );
			await board.addCardToRow(bdf, "close", card.holder);
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
	emhyr_emperor: {
		description: "Look at 3 random cards from your opponent's hand.",
		activated: async card => {
			// Wait for the opponent to close the carousel
			if (card.holder.controller instanceof ControllerOpponent) {
				await new Promise((resolve) => {
					const handleMessage = async (event) => {
						const data = JSON.parse(event.data);
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
						const data = JSON.parse(event.data);

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
						const data = JSON.parse(event.data);

						if (data.type === "medicDraw") {
							const drawnCard = player_op.grave.cards.filter(c => c.isUnit() && c.filename === data.card)[0]
							if (drawnCard) {
								resolve(drawnCard);
							}
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
		description: "Discard 2 cards and draw 1 card of your choice from your deck.",
		activated: async (card) => {
			let hand = board.getRow(card, "hand", card.holder);
			let deck = board.getRow(card, "deck", card.holder);
			if (card.holder.controller instanceof ControllerOpponent) {
				// Wait for the opponent to choose which cards to discard and which to get
				await new Promise((resolve) => {
					let flag = 0;
					const handleMessage = async (event) => {
						const data = JSON.parse(event.data);
						if (data.type === "removeCardHand") {
							// Edit by Rick: Previously used data.index, but hand order seems to not always be synchronized.
							// So now uses card filename instead.
							// OLD: const card = hand.cards[data.index];
							const card = player_op.hand.cards.find(c => c.filename === data.card);
							
							player_op.hand.removeCard(card);
							player_op.grave.addCard(card);
							flag+=1;
						}
						if (data.type === "addCardHand") {
							// Edit by Rick: Previously used data.index, but deck(?) order seems to not always be synchronized.
							// So now uses card filename instead.
							// OLD: const drawnCard = player_op.deck.cards[data.index];
							const drawnCard = player_op.deck.cards.find(c => c.filename === data.card);
							
							player_op.deck.removeCard(drawnCard);
							player_op.hand.addCard(drawnCard);
							flag+=1;
						}

						if (flag === 3) {
							resolve(true);
						}
					}
					socket.addEventListener('message', handleMessage);
				});

				return;
			} else
				Carousel.curr.exit();
			
			// Edit by Rick: Previously handled everything inline and didn't return the card object.
			// Returning a card object is now required in order to read its filename as per the changes made in gwent.js.
			// OLD: await ui.queueCarousel(hand, 2, (c,i) => board.toGrave(c.cards[i], c), () => true);
			// OLD: await ui.queueCarousel(deck, 1, (c,i) => board.toHand(c.cards[i], deck), () => true, true);
			await ui.queueCarousel(hand, 1, (c,i) => {
				let cardToDiscard = c.cards[i]
				board.toGrave(cardToDiscard, c);
				if (Carousel.curr) Carousel.curr.update();
				return cardToDiscard;
			}, () => true);
			// Wait a bit so the board/hand state updates visually.
			await new Promise(r => setTimeout(r, 500));
			// Now just do it again instead of instructing the previous ui.queueCarousel() call to require 2 cards.
			// Fixes an issue with the carousel not updating inbetween selecting card 1 and 2.
			await ui.queueCarousel(hand, 1, (c,i) => {
				let cardToDiscard = c.cards[i]
				board.toGrave(cardToDiscard, c);
				if (Carousel.curr) Carousel.curr.update();
				return cardToDiscard;
			}, () => true);
			// Wait a bit so the board/hand state updates visually.
			await new Promise(r => setTimeout(r, 500));
			// Now finally pick one card to draw from your deck, again returning the card object to ensure receiving client can look it up.
			await ui.queueCarousel(deck, 1, (c,i) => {
				let cardToDraw = c.cards[i];
				board.toHand(cardToDraw, deck);
				return cardToDraw;
			}, () => true, true);

		},
		weight: (card, ai) => {
			let cards = ai.discardOrder(card).splice(0,2).filter(c => c.basePower < 7);
			if (cards.length < 2)
				return 0;
			return cards[0].abilities.includes("muster") ? 50 : 25;
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
						const data = JSON.parse(event.data);
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
			for (const c of opGraveSorted) {
				await moveToDeckBottom(c, card.holder.opponent());
			}

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
	}
};