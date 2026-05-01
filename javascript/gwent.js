"use strict"


class Controller {}

// Better menu //
const menuBtn = document.getElementById("top-menu-btn");
const menu = document.getElementById("top-menu");

menuBtn.onclick = () => {
    menu.classList.toggle("hidden");
};


document.getElementById("join-game").onclick = () => {
    const code = prompt("Enter Session ID:");

    if (!code) return;

    comp_and_send(socket, JSON.stringify({
        type: "joinSession",
        sessionId: code.toUpperCase()
    }));
};








const readyButtonElem = document.getElementById("session-start-control");
const opponentReadyElem = document.getElementById("opponent-ready");
const isOpponentReadyElem = document.getElementById("opponent-ready");
const passButton = document.getElementById("pass-button");
const customizationElem = document.getElementById("deck-customization");
const gameStartControlsElem = document.getElementById("session-start-control");
const ep_id = document.getElementById("player-id-btn");

let debug = true;

function showTooltip(text) {
    const tooltip = document.getElementById("tooltip");

    // set message
    tooltip.textContent = `${text}`;

    tooltip.classList.add("show");

    setTimeout(() => {
        tooltip.classList.remove("show");
    }, 3200);
}

function cardredrawnotice(text) {
    tooltipQueue.push(text);
    processTooltipQueue();
}

function processTooltipQueue() {
    if (tooltipActive) return;
    if (tooltipQueue.length === 0) return;

    tooltipActive = true;

    const tooltip2 = document.getElementById("tooltip2");
    const text = tooltipQueue.shift();

    tooltip.textContent = text;
    tooltip.classList.add("show");

    setTimeout(() => {
        tooltip.classList.remove("show");

        // small delay so CSS fade-out can finish cleanly
        setTimeout(() => {
            tooltipActive = false;
            processTooltipQueue();
        }, 200);

    }, 3200);
}

document.getElementById("copy-session").onclick = () => {
// document.querySelector("copy-session").addEventListener("click", async () => {
	console.log("clicked session copy", joinedSessionId)
    if (!joinedSessionId) return;

    try {
        navigator.clipboard.writeText(joinedSessionId);
        showTooltip(joinedSessionId);
    } catch (err) {
        console.error("Copy failed:", err);
    }
};

// Websocket and Server config.
let wsUrl;

const host = window.location.hostname;

if (
  host.includes("localhost") ||
  host.includes("127.0.0.1") ||
  host.includes("::1")
) {
  wsUrl = "ws://localhost:8081";
} else {
  wsUrl = `wss://drmineword-gwent.onrender.com`;
}

console.log("Websocket", wsUrl);
// const socket = new WebSocket('ws://127.0.0.1:8080');				// Example line for when using local installation instead of remote deployment.
const socket = new WebSocket(wsUrl);	// Websocket + server is expected to be reachable on this URL. Disable if using local installation.
let amReady = false;
let opponentReady = false;
let playerId = null;


// Super JSON Compressor for WebSockets
// Uses Brotli if available, falls back to gzip-like Deflate via CompressionStream
// Sends binary Uint8Array payloads
// Logs stats + SHA hash + failure reasons

const TextEnc = new TextEncoder();
const TextDec = new TextDecoder();

async function sha256(buffer) {
    const hash = await crypto.subtle.digest("SHA-256", buffer);
    return [...new Uint8Array(hash)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

async function compressData(str) {
    const input = TextEnc.encode(str);

    if ("CompressionStream" in window) {
        const cs = new CompressionStream("deflate-raw");
        const writer = cs.writable.getWriter();
        writer.write(input);
        writer.close();

        const compressed = await new Response(cs.readable).arrayBuffer();
        return new Uint8Array(compressed);
    }

    throw new Error("CompressionStream not supported.");
}

async function decompressData(uint8) {
    if ("DecompressionStream" in window) {
        const ds = new DecompressionStream("deflate-raw");
        const writer = ds.writable.getWriter();
        writer.write(uint8);
        writer.close();

        const decompressed = await new Response(ds.readable).arrayBuffer();
		console.log("Decompressed:", decompressed);
        return TextDec.decode(decompressed);
    }

    throw new Error("DecompressionStream not supported.");
}

async function comp_and_send(socket, jsonString) {
	console.log("Comp and send:", socket, jsonString);
    try {
        const before = TextEnc.encode(jsonString).length;

        const compressed = await compressData(jsonString);

        const after = compressed.length;
        const saved = ((1 - after / before) * 100).toFixed(3);
        const hash = await sha256(compressed);

        console.log("Bytes before:", before);
        console.log("Bytes after :", after);
        console.log("Compressed% :", saved + "%");
        console.log("Payload sha :", hash);

        if (socket.readyState !== WebSocket.OPEN) {
            alert("Socket send failed: socket not open");
            return;
        }

        socket.send(compressed);

    } catch (err) {
        console.error(err);
        alert("Socket send failed: " + err.message);
    }
}

async function recv_and_decomp(event) {
	console.log("recv_and_decomp");
    try {
        let buffer;

        if (event.data instanceof Blob) {
            buffer = await event.data.arrayBuffer();
        } else if (event.data instanceof ArrayBuffer) {
            buffer = event.data;
        } else {
            throw new Error("Unsupported message type");
        }

        const uint8 = new Uint8Array(buffer);
        const json = await decompressData(uint8);

        console.log("Received JSON:", json);
        return JSON.parse(json);

    } catch (err) {
        alert("Socket receive failed: " + err.message);
    }
}




function showTooltip(text) {
    const tooltip = document.getElementById("tooltip");

    // set message
    tooltip.textContent = `${text}`;

    tooltip.classList.add("show");

    setTimeout(() => {
        tooltip.classList.remove("show");
    }, 3200);
}

document.getElementById("copy-session").onclick = () => {
// document.querySelector("copy-session").addEventListener("click", async () => {
	console.log("clicked session copy", joinedSessionId)
    if (!joinedSessionId) return;

    try {
        navigator.clipboard.writeText(joinedSessionId);
        showTooltip(`Copied: ${joinedSessionId}`);
    } catch (err) {
        console.error("Copy failed:", err);
    }
};



socket.onmessage = async (event) => {
    console.log('[socket raw event.data]', event.data);
	const event_parsed = await recv_and_decomp(event);
	console.log("event_parsed", event_parsed);
	const data = event_parsed; //.data;
console.log("onmsg data:", data)
		switch (data.type) {
			case "welcome":
				playerId = data.playerId;
				console.log("Welcome, your id is " + playerId);
ep_id.textContent = `Hello PlayerID:\n${playerId}`;
ep_id.style.color = "";
				menuBtn.style.transition = "color 2s ease";
menuBtn.style.color = "lightgreen";

setTimeout(() => {
    menuBtn.style.color = "";
}, ui_display_times.socketready);
				break;
			
			// Opponent has joined and the session is ready
			case "sessionCreated":
			console.log("Parsing vars for session join", data);
			joinedSessionId = data.code;
			console.log("joinedSessionId",joinedSessionId);
			break;
			case "sessionReady":
				console.log("sessionReady");
				// showTooltip("Opponent has joined and the session is ready");
				// [socket raw event.data] {"type":"sessionJoined","code":"XRA2"}
				readyButtonElem.classList.remove("hidden");
				isOpponentReadyElem.classList.remove("hidden");
				
				  document.getElementById("session-display").classList.remove("hidden");
    document.getElementById("session-code-text").textContent = joinedSessionId;
	
	// joinedSessionId;
				// sends the opponent which faction you're playing with
				comp_and_send(socket, JSON.stringify({ type: "opChangeFaction", faction: dm.faction }));
				break;

			// Opponent has left and the session is no longer ready
			case "sessionUnready":
				showTooltip("Opponent has left and the session is no longer ready");
				twoPlayersConnected = false
				console.log("---------------------");
				console.log("Opponent left the game");
				isOpponentReadyElem.classList.add("hidden");

				readyButtonElem.classList.add("disabled");
				// if (game.roundCound > 0) { //oryginal dev typo X D
				var game_state = this.game;
				console.log("END GAME TRY round counts", game_state.roundCount, "game", game_state);
				if (game_state.roundCount > 0) {
					console.log("running");
					await ui.notification("win-opleft", ui_display_times.round_end_result *2);

					game.returnToCustomization();
					if (joinedSessionId) {
						cancelSession();
					}
				}
				break;
			
			// Opponent is ready. If you are ready begin the game immediately
			case "ready":
				 showTooltip("Opponent is ready. If you are ready begin the game immediately");
				player_op = new Player(1, "Opponent", data.deck);
				if (amReady) {
					customizationElem.classList.add("hide");
					gameStartControlsElem.classList.add("hide");
		
					game.startGame();
					return
				} else {
					opponentReadyElem.classList.remove("disabled");
					opponentReady = true;
				}
				break;

			case "opChangeFaction":
				twoPlayersConnected = true;
				console.log("opponent has changed his faction");
				 showTooltip(`Opponent changed his faction to ${data.faction}`);
				opponentReadyElem.querySelector("img").src = `img/icons/deck_shield_${data.faction}.png`
				break;
			
			case "unReady":
				opponentReady = false;
				amReady = false;
			//	twoPlayersConnected = true;
				 showTooltip("Opponent is unReady.");
				opponentReadyElem.classList.add("disabled");
				if (amReady) {
					readyButtonElem.classList.remove("ready");
					customizationElem.classList.remove("noclick");
				}
				break;
			
			// Initializes Opponent's updated Hand and Deck
			case "initial_reDraw":
				data.deck = fillCardElements(data.deck, player_op);
				data.hand = fillCardElements(data.hand, player_op);

				player_op.hand.cards = data.hand;
				player_op.deck.cards = data.deck;
				break;

			// Game-start
			case "start":
				console.log("---------------------");
				console.log("Match start");
				
				game.startRound()
				tocar("game_start", false);
				break;

			// Game - Opponent plays card
			case "play":
				const card = player_op.hand.cards.find(c => c.filename === data.card.filename);
				console.log("Opponent plays card", card);

				const splitRowName = data.row.split("-");
				let row
				if (splitRowName.length > 1) {
					const targetRow = splitRowName[0] === "self" ? "target" : "self";
					row = board.row.find(r => r.elem_parent.id === `${targetRow}-${splitRowName[1]}`);
				} else {
					row = data.row
				}
				
				if (data.card.filename === "decoy") {
					const replacedCard = row.cards.find(bc => bc.filename === data.target.filename);
					if (!replacedCard) return
					
					board.moveTo(replacedCard, player_op.hand, row);
				}
				
				if (row === "weather") 
					await player_op.playCard(card, row);
				else if (data.card.filename === "scorch")
					await  player_op.playScorch(card);
				else
					await player_op.playCardToRow(card, row);
				break;

			// Game - Opponent pass
			case "pass":
				player_op.passRound();
				break;

			// Game - Opponent used the leader card
			case "useLeader":
				player_op.activateLeader()
				break;
		}
};











function fillCardElements (cards, player) {
	for (let i = 0; i < cards.length; i++) {
		const cardFromDict = card_dict.find(dict => dict.filename === cards[i].filename);
		cards[i] = new Card(cardFromDict, player);
	};
	return cards
}

// Opponent Controller
class ControllerOpponent {
	constructor(player) {
		player.tag = "op";

		this.player = player;
	}
}

// Can make actions during turns like playing cards that it owns
class Player {
	constructor(id, name, deck) {
		this.id = id;
		this.tag = "me";
		this.controller = (id === 0) ? new Controller() : new ControllerOpponent(this);

		this.hand = (id === 0) ? new Hand(document.getElementById("hand-row")) : new HandOpponent();
		this.grave =  new Grave( document.getElementById("grave-" + this.tag));
		this.deck = new Deck(deck.faction, document.getElementById("deck-" + this.tag));
		this.deck_data = deck;
		
		this.leader = new Card(deck.leader, this);
		this.elem_leader = document.getElementById("leader-" + this.tag);
		this.elem_leader.children[0].appendChild( this.leader.elem );
		
		this.reset();
		
		this.name = name;
		document.getElementById("name-" + this.tag).innerHTML = name;
		
		document.getElementById("deck-name-" +this.tag).innerHTML = factions[deck.faction].name;
		document.getElementById("stats-" + this.tag).getElementsByClassName("profile-img")[0].children[0].children[0];
		let x = document.querySelector("#stats-" +this.tag+ " .profile-img > div > div");
		x.style.backgroundImage = iconURL("deck_shield_" + deck.faction);
	}
	
	// Sets default values
	reset(){
		this.grave.reset();
		this.hand.reset();
		this.deck.reset();
		this.deck.initializeFromID(this.deck_data.cards, this);
		
		this.health = maxhealth;
		this.total = 0;
		this.passed = false;
		this.handsize = thishandsize;
		this.winning = false;
	
		this.enableLeader();
		this.setPassed(false);
		document.getElementById("gem1-" +this.tag).classList.add("gem-on");
		document.getElementById("gem2-" +this.tag).classList.add("gem-on");
	}
	
	// Returns the opponent Player
	opponent(){
		return board.opponent(this);
	}
	
	// Updates the player's total score and notifies the gamee
	updateTotal(n){
		this.total += n;
		document.getElementById("score-total-" + this.tag).children[0].innerHTML = this.total;
		board.updateLeader();
	}
	
	// Puts the player in the winning state
	setWinning(isWinning) {
		if (this.winning ^ isWinning)
			document.getElementById("score-total-" + this.tag).classList.toggle("score-leader");
		this.winning = isWinning;
	}
	
	// Puts the player in the passed state
	setPassed(hasPassed) {
		if (this.passed ^ hasPassed)
			document.getElementById("passed-" + this.tag).classList.toggle("passed");
		this.passed = hasPassed;
	}
	
	// Sets up board for turn
	async startTurn(){
		document.getElementById("stats-" + this.tag).classList.add("current-turn");
		if (this.leaderAvailable)
			this.elem_leader.children[1].classList.remove("hide");
		
		if (this === player_me) {
			document.getElementById("pass-button").classList.remove("noclick");
		}
	}
	
	// Passes the round and ends the turn
	passRound(){
		this.setPassed(true);
		this.endTurn();
	}
	
	// Plays a scorch card
	async playScorch(card){
		await this.playCardAction(card, async () => await ability_dict["scorch"].activated(card));
	}
	
	// Plays a card to a specific row
	async playCardToRow(card, row){
		await this.playCardAction(card, async () => await board.moveTo(card, row, this.hand));
	}
	
	// Plays a card to the board
	async playCard(card){
		await this.playCardAction(card, async () => await card.autoplay(this.hand));
	}
	
	// Shows a preview of the card being played, plays it to the board and ends the turn
	async playCardAction(card, action){
		console.log("[ShowCard]", card, action, ui_display_times.show_me_that_card_you_have);
		ui.showPreviewVisuals(card);
		await sleep(ui_display_times.show_me_that_card_you_have);
		ui.hidePreview(card);
		await action();
		this.endTurn();
	}
	
	// Handles end of turn visuals and behavior the notifies the game
	endTurn(){
		if (!this.passed && !this.canPlay())
			this.setPassed(true);
		if (this === player_me){
			document.getElementById("pass-button").classList.add("noclick");
		}
		document.getElementById("stats-" + this.tag).classList.remove("current-turn");
		this.elem_leader.children[1].classList.add("hide");
		game.endTurn()
	}
	
	// Tells the the Player if it won the round. May damage health.
	endRound(win){
		if (!win) {
			if (this.health < 1)
				return;
			document.getElementById("gem" + this.health + "-" +this.tag).classList.remove("gem-on");
			this.health--;
		}
		this.setPassed(false);
		this.setWinning(false);
	}
	
	// Returns true if the Player can make any action other than passing
	canPlay() {
		return this.hand.cards.length > 0 || this.leaderAvailable;
	}
	
	// Use a leader's Activate ability, then disable the leader
	async activateLeader() {
		ui.showPreviewVisuals(this.leader);
		await sleep(1500);
		ui.hidePreview(this.leader);
		await this.leader.activated[0](this.leader, this);
		this.disableLeader();
		this.endTurn();
	}
	
	// Disable access to leader ability and toggles leader visuals to off state
	disableLeader(){
		this.leaderAvailable = false;
		let elem = this.elem_leader.cloneNode(true);
		this.elem_leader.parentNode.replaceChild(elem, this.elem_leader);
		this.elem_leader = elem;
		this.elem_leader.children[0].classList.add("fade");
		this.elem_leader.children[1].classList.add("hide");
		this.elem_leader.addEventListener("click", async () => await ui.viewCard(this.leader), false);
	}
	
	// Enable access to leader ability and toggles leader visuals to on state
	enableLeader() {
		this.leaderAvailable = this.leader.activated.length > 0;
		let elem = this.elem_leader.cloneNode(true);
		this.elem_leader.parentNode.replaceChild(elem, this.elem_leader);
		this.elem_leader = elem;
		this.elem_leader.children[0].classList.remove("fade");
		this.elem_leader.children[1].classList.remove("hide");
		
		if (this.id === 0 && this.leader.activated.length > 0){
			this.elem_leader.addEventListener("click", async () => {
				await ui.viewCard(this.leader, async () => {
						comp_and_send(socket, JSON.stringify({ type: "useLeader", player: this.id }));
						await this.activateLeader();
				});
		});
		} else {
			this.elem_leader.addEventListener("click", async () => await ui.viewCard(this.leader), false);
		}
		
		// TODO set crown color
	}
	
}

// Handles the adding, removing and formatting of cards in a container
class CardContainer {
	constructor(elem) {
		this.elem = elem;
		this.cards = [];
	}
	
	// Returns the first card that satisfies the predcicate. Does not modify container.
	findCard(predicate){
		for (let i=this.cards.length-1; i>=0; --i)
			if (predicate(this.cards[i]))
				return this.cards[i];
	}
	
	// Returns a list of cards that satisfy the predicate. Does not modify container.
	findCards(predicate){
		return this.cards.filter(predicate);
	}
	
	// Returns a list of up to n cards that satisfy the predicate. Does not modify container.
	findCardsRandom(predicate, n){
		let valid = predicate ? this.cards.filter(predicate) : this.cards;
		if (valid.length === 0)
			return [];
		if (!n || n === 1)
			return [valid[randomInt(valid.length)]];
		let out = [];
		for (let i=Math.min(n, valid.length); i>0 ; --i){
			let index = randomInt(valid.length);
			out.push( valid.splice(index,1)[0] );
		}
		return out;
	}
	
	// Removes and returns a list of cards that satisy the predicate.
	getCards(predicate){
		return this.cards.reduce((a,c,i) => ( predicate(c,i)?[i]:[] ).concat(a), []).map( i => this.removeCard(i));
	}
	
	// Removes and returns a card that satisfies the predicate.
	getCard(predicate) {
		for (let i=this.cards.length-1; i>=0; --i)
			if (predicate(this.cards[i]))
				return this.removeCard(i);
	}
	
	// Removes and returns any cards up to n that satisfy the predicate.
	getCardsRandom(predicate, n) {
		return this.findCardsRandom(predicate, n).map( c => this.removeCard(c) );
	}
	
	// Adds a card to the container along with its associated HTML element.
	addCard(card, index){
		this.cards.push(card);
		this.addCardElement(card, index?index:0);
		this.resize();
	}
	
	// Removes a card from the container along with its associated HTML element.
	removeCard(card, index){
		if (this.cards.length === 0)
			throw "Cannot draw from empty " + this.constructor.name;
		card = this.cards.splice( isNumber(card)? card : this.cards.indexOf(card) , 1)[0];
		this.removeCardElement(card, index?index:0);
		this.resize();
		return card;
	}
	
	// Adds a card to a pre-sorted CardContainer
	addCardSorted(card){
		let i = this.getSortedIndex(card);
		this.cards.splice(i, 0, card);
		return i;
	}
	
	// Returns the expected index of a card in a sorted CardContainer
	getSortedIndex(card){
		for (var i=0; i<this.cards.length; ++i)
			if (Card.compare(card, this.cards[i]) < 0)
				break;
		return i;
	}
	
	// Adds a card to a random index of the CardContainer
	//addCardRandom(card){
	//	this.cards.push(card);
	//	let index = randomInt(this.cards.length);
	//	if (index !== this.cards.length-1) {
	//		let t = this.cards[this.cards.length-1];
	//		this.cards[this.cards.length-1] = this.cards[index];
	//		this.cards[index] = t;
	//	}
	//	return index;
//	}
addCardRandom(card) {
//	console.log("[addRCard] called", { game, card });

	this.cards.push(card);
//	console.log("[addRCard] after push", { cardsLength: this.cards.length });
	var CardsAll = this.cards;
//	console.log("CardPicked?", CardsAll);

	let index = randomInt(this.cards.length);
//	console.log("[addRCard] random index", index);

	if (index !== this.cards.length - 1) {
		//console.log("[addRCard] swapping", {
		//	from: this.cards.length - 1,
		//	to: index
	//	});

		let t = this.cards[this.cards.length - 1];
		this.cards[this.cards.length - 1] = this.cards[index];
		this.cards[index] = t;
	}

	//console.log("[addRCard] result index", index, { game });
	//console.log("CardPicked?", CardsAll[this.cards.length - 1]);

	return index;
}
	
	// Removes the HTML elemenet associated with the card from this CardContainer
	removeCardElement(card, index){
		if (this.elem)
			this.elem.removeChild(card.elem);
	}
	
	// Adds the HTML elemenet associated with the card to this CardContainer
	addCardElement(card, index){
		if (this.elem){
			if (index === this.cards.length)
				thise.elem.appendChild(card.elem);
			else
				this.elem.insertBefore(card.elem, this.elem.children[index]);
		}
	}
	
	// Empty function to be overried by subclasses that resize their content
	resize(){}
	
	// Modifies the margin of card elements inside a row-like container to stack properly
	resizeCardContainer(overlap_count, gap, coef) {
		let n = this.elem.children.length;
		let param = (n < overlap_count) ?  "" + gap+"vw" : defineCardRowMargin(n, coef);
		let children = this.elem.getElementsByClassName("card");
		for (let x of children)
			x.style.marginLeft = x.style.marginRight = param;
		
		function defineCardRowMargin(n, coef = 0){
			return "calc((100% - (4.45vw * " + n + ")) / (2*" +n+ ") - (" +coef+ "vw * " +n+ "))";
		}
	}
	
	// Allows the row to be clicked
	setSelectable(){
		this.elem.classList.add("row-selectable");
	}
	
	// Disallows the row to be clicked
	clearSelectable() {
		this.elem.classList.remove("row-selectable");
		for (card in this.cards)
			card.elem.classList.add("noclick");
	}
	
	// Returns the container to its default, empty state
	reset() {
		while(this.cards.length)
			this.removeCard(0);
		if (this.elem)
			while(this.elem.firstChild)
				this.elem.removeChild(this.elem.firstChild);
		this.cards = [];
	}
	
}

// Contians all used cards in the order that they were discarded
class Grave extends CardContainer {
	constructor(elem) {
		super(elem)
		elem.addEventListener("click", () => ui.viewCardsInContainer(this), false);
	}
	
	// Override
	addCard(card){
		this.setCardOffset(card, this.cards.length);
		super.addCard(card, this.cards.length);
	}
	
	// Override
	removeCard(card){
		let n = isNumber(card) ? card : this.cards.indexOf(card);
		return super.removeCard(card, n);
	}
	
	// Override
	removeCardElement(card, index){
		card.elem.style.left = "";
		super.removeCardElement(card, index);
		for (let i=index; i<this.cards.length; ++i){
			this.setCardOffset(this.cards[i], i);
		}
	}
	
	// Offsets the card element in the deck
	setCardOffset(card, n){
		card.elem.style.left =  -0.03 * n +"vw";
	}
}

// Contains a randomized set of cards to be drawn from
class Deck extends CardContainer {
	constructor(faction, elem){
		super(elem);
		this.faction = faction;

		this.counter = document.createElement("div");
		this.counter.classList = "deck-counter center";
		this.counter.appendChild( document.createTextNode(this.cards.length) );
		this.elem.appendChild(this.counter);
	}
	
	// Creates duplicates of cards with a count of more than one, then initializes deck
	initializeFromID(card_id_list, player){
		this.initialize( card_id_list.reduce((a,c) => a.concat(clone(c.count, card_dict[c.index])), []), player);
		function clone(n ,elem) { for (var  i=0, a=[]; i<n; ++i) a.push(elem); return a; }
	}
	
	// Populates a deck with a list of card data and associated those cards with the owner of this deck.
	initialize(card_data_list, player){
		for (let i=0; i<card_data_list.length; ++i) {
			let card = new Card(card_data_list[i], player);
			card.holder = player;
			this.addCardRandom(card);
			this.addCardElement();
		}
		this.resize();
	}
	
	// Override
	addCard(card){
		this.addCardRandom(card);
		this.addCardElement();
		this.resize();
	}
	
	// Sends the top card from the Deck to the Hand
	async draw(hand) {
		let drawnCard = null
		tocar("game_buy", false);
		if (hand === player_op.hand) {
			drawnCard = this.removeCard(0)
			hand.addCard(drawnCard);
		} else {
			drawnCard = this.cards[0];
			await board.toHand(drawnCard, this);
		}

		if (drawnCard !== null)
			return drawnCard
	}
	
	// Draws a card and sends it to the container before adding a card from the container back to the deck.
	//swap(container, card){
	//	container.addCard(this.removeCard(0));
	//	this.addCard(card);
	//	}
	swap(container, card){
    const fromDeck = this.cards[0]; // card that will be removed

    console.log("SWAP START", "\n Deck gives:", fromDeck?.name,"\n Hand gives:", card?.name);

    const removedFromDeck = this.removeCard(0);

    container.addCard(removedFromDeck);
    this.addCard(card);

    console.log("SWAP RESULT", "\n -> Deck received:", card?.name, "\n -> Hand received:", removedFromDeck?.name);
	try { var txt_draw = `You redrawed card \"${card?.name}\" for a \"${removedFromDeck?.name}\"`; console.log(txt_draw); cardredrawnotice(txt_draw); } catch (e) { console.log("cardredrawnotice err", e); }
}
	
	// Override
	addCardElement() {
		let elem = document.createElement("div");
		elem.classList.add("deck-card");
		elem.style.backgroundImage = iconURL("deck_back_" + this.faction, "jpg");
		this.setCardOffset(elem, this.cards.length-1);
		this.elem.insertBefore(elem, this.counter);
	}
	
	// Override
	removeCardElement(){
		this.elem.removeChild(this.elem.children[this.cards.length]).style.left = "";
	}
	
	// Offsets the card element in the deck
	setCardOffset(elem, n){
		elem.style.left =  -0.03 * n +"vw";
	}
	
	// Override
	resize(){
		this.counter.innerHTML = this.cards.length;
		this.setCardOffset(this.counter, this.cards.length);
	}
	
	// Override
	reset() {
		super.reset();
		this.elem.appendChild(this.counter);
	}
}

// Hand used by Opponent. Has an offscreen HTML element for card transitions.
class HandOpponent extends CardContainer {
	constructor() {
		super(undefined);
		this.counter = document.getElementById("hand-count-op"); 
		this.hidden_elem = document.getElementById("hand-op");
	}
	resize() {this.counter.innerHTML = this.cards.length; }
}

// Hand used by current player
class Hand extends CardContainer {
	constructor(elem){
		super(elem);
		this.counter = document.getElementById("hand-count-me");
	}
	
	// Override
	addCard(card){
		let i = this.addCardSorted(card);
		this.addCardElement(card, i);
		this.resize();
	}
	
	// Override
	resize() {
		this.counter.innerHTML = this.cards.length;
		this.resizeCardContainer(11, 0.075, .00225);
	}
}

// Contains active cards and effects. Calculates the current score of each card and the row.
class Row extends CardContainer {
	constructor(elem) {
		super(elem.getElementsByClassName("row-cards")[0]);
		this.elem_parent = elem;
		this.elem_special = elem.getElementsByClassName("row-special")[0];
		this.special = null;
		this.total = 0;
		this.effects = { weather:false, bond: {}, morale: 0, horn: 0, mardroeme: 0 };
		this.elem.addEventListener("click", () => ui.selectRow(this), true);
		this.elem_special.addEventListener("click", () => ui.selectRow(this), false, true);
		this.elem.addEventListener("mouseover", function() {
				tocar("card", false);
				this.style.boxShadow = "0 0 1.5vw #6d5210";
		});
		this.elem.addEventListener("mouseout", function() {
			this.style.boxShadow = "0 0 0 #6d5210"
		});
	}
	
	// Override
	async addCard(card) {
		if (card.isSpecial()) {
			this.special = card;
			this.elem_special.appendChild(card.elem);
		} else {
			let index = this.addCardSorted(card);
			this.addCardElement(card, index);
			this.resize();
		}
		this.updateState(card, true);
		for (let x of card.placed) 
			await x(card, this);
		card.elem.classList.add("noclick");
		await sleep(600);
		this.updateScore();
	}
	
	// Override
	removeCard(card) {
		card = isNumber(card) ? card === -1 ? this.special : this.cards[card] : card;
		if (card.isSpecial()) {
			this.special = null;
			this.elem_special.removeChild(card.elem);
		} else {
			super.removeCard(card);
			card.resetPower();
		}
		this.updateState(card, false);
		for (let x of card.removed)
			x(card);
		this.updateScore();
		return card;
	}
	
	// Override
	removeCardElement(card, index) {
		super.removeCardElement(card, index);
		let x = card.elem;
		x.style.marginLeft = x.style.marginRight = "";
		x.classList.remove("noclick");
	}
	
	// Updates a card's effect on the row
	updateState(card, activate){
		for (let x of card.abilities){
			switch (x) {
				case "morale":
				case "horn":
				case "mardroeme": this.effects[x] += activate ? 1 : -1; break;
				case "bond": 
					if (!this.effects.bond[card.id()])
						this.effects.bond[card.id()] = 0;
					this.effects.bond[card.id()] += activate ? 1 : -1;
					break;
			}
		}
	}
	
	// Activates weather effect and visuals
	addOverlay(overlay){
		var som = overlay == "fog" || overlay == "rain" ? overlay : overlay == "frost" ? "cold" : "";
		if (som != "") tocar(som, false);
		this.effects.weather = true;
		this.elem_parent.getElementsByClassName("row-weather")[0].classList.add(overlay);
		this.updateScore();
	}
	
	// Deactivates weather effect and visuals
	removeOverlay(overlay){
		this.effects.weather = false;
		this.elem_parent.getElementsByClassName("row-weather")[0].classList.remove(overlay);
		this.updateScore();
	}
	
	// Override
	resize(){
		this.resizeCardContainer(10, 0.075, .00325);
	}
	
	// Updates the row's score by summing the current power of its cards
	updateScore() {
		let total = 0;
		for (let card of this.cards) {
			total += this.cardScore(card);
		}
		let player = this.elem_parent.parentElement.id === "field-op" ? player_op : player_me;
		player.updateTotal(total - this.total);
		this.total = total;
		this.elem_parent.getElementsByClassName("row-score")[0].innerHTML = this.total;
	}
	
	// Calculates and set the card's current power
	cardScore(card){
		let total = this.calcCardScore(card);
		card.setPower(total);
		return total;
	}
	
	// Calculates the current power of a card affected by row affects
	calcCardScore(card) {
		// console.log("calcCardScore(card)", card, this);
		if (card.name === "decoy")
			return 0;
		let total = card.basePower;
		if (card.hero)
			return total;
		if (this.effects.weather) 
			total = Math.min(1, total);
		if (game.doubleSpyPower && card.abilities.includes("spy"))
			total *= 2;
		if (game.doubleSpyPower && card.abilities.includes("sabotage")) //Double sabotage power
			 total = Math.ceil(total * 1.5);
		let bond = this.effects.bond[card.id()];
		if (isNumber(bond) && bond > 1)
			total *= Number(bond);
		total += Math.max(0, this.effects.morale + (card.abilities.includes("morale") ? -1 : 0 ));
		if (this.effects.horn - (card.abilities.includes("horn") ? 1 : 0) >  0 )
			total *= 2;
		return total;
	}
	
	// Applies a temporary leader horn affect that is removed at the end of the round
	async leaderHorn(){
		if (this.special !== null)
			return;
		let horn = new Card(card_dict[5], null);
		await this.addCard(horn);
		game.roundEnd.push( () => this.removeCard(horn) );
	}
	
	// Applies a local scorch effect to this row
	async scorch() {
		if (this.total >= 10)
			await Promise.all( this.maxUnits().map( async c => {
				await c.animate("scorch", true, false);
				await board.toGrave(c, this);
			}));
	}
	
	// Removes all cards and effects from this row
	clear() {
		if (this.special != null)
			board.toGrave(this.special, this);
		this.cards.filter(c => !c.noRemove).forEach(c => board.toGrave(c, this) );
	}

	// Returns all regular unit cards with the heighest power
	maxUnits(){
		let max = [];
		for (let i=0; i<this.cards.length; ++i){
			let card = this.cards[i];
			if (!card.isUnit())
				continue;
			if (!max[0] || max[0].power < card.power)
				max = [card];
			else if (max[0].power === card.power)
				max.push(card);
		}
		return max;
	}
	
	// Override
	reset(){
		super.reset();
		while(this.special)
			this.removeCard(this.special);
		while(this.elem_special.firstChild)
			this.elem_special.removeChild(this.elem_speical.firstChild);
		this.total = 0;
		//["rain","fog","frost"].forEach( w => this.removeOverlay(w) );
		this.effects = {weather:false, bond: {}, morale: 0, horn: 0, mardroeme: 0};
	}
}

// Handles how weather effects are added and removed
class Weather extends CardContainer {
	constructor(elem) {
		super(document.getElementById("weather"));
		this.types = {
			rain: {name:"rain", count: 0, rows: []},
			fog: {name:"fog", count: 0, rows: []},
			frost: {name:"frost", count: 0, rows: []}
		}
		let i=0;
		for (let key of Object.keys(this.types))
			this.types[key].rows = [board.row[i], board.row[5-i++]];
		
		this.elem.addEventListener("click",() => ui.selectRow(this), false);
	}
	
	// Adds a card if unique and clears all weather if 'clear weather' card added
	async addCard(card) {
		super.addCard(card);
		card.elem.classList.add("noclick");
		if (card.name === "Clear Weather"){
			// TODO Sunlight animation
			tocar("clear", false);
			await sleep(500);
			this.clearWeather();
		} else {
			this.changeWeather(card, x => ++this.types[x].count === 1, (r,t) => r.addOverlay(t.name));
			for (let i=this.cards.length-2; i>=0; --i) {
				if (card.name === this.cards[i].name) {
					await sleep(750);
					await board.toGrave(card, this);
					break;
				}
			}
		}
		await sleep(750);
	}
	
	// Override
	removeCard(card){
		card = super.removeCard(card);
		card.elem.classList.remove("noclick");
		this.changeWeather(card, x => --this.types[x].count === 0, (r,t) => r.removeOverlay(t.name));
		return card;
	}
	
	// Checks if a card's abilities are a weather type. If the predicate is met, perfom the action
	// on the type's associated rows
	changeWeather(card, predicate, action) {
		for (let x of card.abilities) {
			if (x in this.types && predicate(x)){
				for (let r of this.types[x].rows)
					action(r, this.types[x]);
			}
		}
	}
	
	// Removes all weather effects and cards
	async clearWeather() {
		await Promise.all(this.cards.map((c,i)=>this.cards[this.cards.length-i-1]).map(c => board.toGrave(c, this)));
	}
	
	// Override
	resize() {
		this.resizeCardContainer(4, 0.075, .045);
	}
	
	// Override
	reset(){
		super.reset();
		Object.keys(this.types).map(t => this.types[t].count = 0);
	}
}

// 
class Board {
	constructor() {
		this.op_score = 0;
		this.me_score = 0;
		this.row = [];
		for (let x=0; x<6; ++x) {
			let elem = document.getElementById( (x<3)?"field-op":"field-me" ).children[x%3];
			this.row[x] = new Row(elem);
		}
	}
	
	// Get the opponent of this Player
	opponent(player){
		return player === player_me ? player_op : player_me;
	}
	
	// Sends and translates a card from the source to the Deck of the card's holder
	async toDeck(card, source){
		tocar("discard", false);
		await this.moveTo(card, "deck", source);
	}
	
	// Sends and translates a card from the source to the Grave of the card's holder
	async toGrave(card, source){
		await this.moveTo(card, "grave", source);
	}

	// Sends and translates a card from the source to the Hand of the card's holder
	async toHand(card, source) {
		await this.moveTo(card, "hand", source);
	}

	// Sends and translates a card from the source to Weather
	async toWeather(card, source) {
		await this.moveTo(card, weather, source);
	}
	
	// Sends and translates a card from the source to the Deck of the card's combat row
	async toRow(card, source) {
		let row = (card.row === "agile") ? "close" : card.row ? card.row : "close";
		await this.moveTo(card, row, source);
	}
	
	// Sends and translates a card from the source to a specified row name or CardContainer
	async moveTo(card, dest, source) {
		if (isString(dest))
			dest = this.getRow(card, dest);

		try {
			cartaNaLinha(dest.elem.id, card);
		} catch(err) {}
		await translateTo(card, source ? source : null, dest);
		await dest.addCard(source ? source.removeCard(card) : card);
	}
	
	// Sends and translates a card from the source to a row name associated with the passed player
	async addCardToRow(card, row_name, player, source) {
		let row = this.getRow(card, row_name, player);
		try {
			cartaNaLinha(row.elem.id, card);
		} catch(err) {}
		await translateTo(card, source, row);
		await row.addCard(card);
	}
	
	// Returns the CardCard associated with the row name that the card would be sent to
	getRow(card, row_name, player){
		player = player ? player : card ? card.holder : player_me;
		let isMe = player === player_me;
		let isSpy = card.abilities.includes("spy") || card.abilities.includes("sabotage");
		switch (row_name) {
			case "weather": return weather; break;
			case "close":  return this.row[ isMe^isSpy ? 3 : 2];
			case "ranged": return this.row[ isMe^isSpy ? 4 : 1];
			case "siege":  return this.row[ isMe^isSpy ? 5 : 0];
			case "grave": return player.grave;
			case "deck": return player.deck;
			case "hand": return player.hand;
			default: console.error( card.name + " sent to incorrect row \"" +row_name+ "\" by " +card.holder.name );
		}
	}
	
	// Updates which player currently is in the lead
	updateLeader() {
		let dif = player_me.total - player_op.total;
		player_me.setWinning(dif > 0);
		player_op.setWinning(dif < 0);
	}
}

class Game {
	constructor() {
		this.endScreen = document.getElementById("end-screen");
		let buttons = this.endScreen.getElementsByTagName("button");
		this.customize_elem = buttons[0];
		this.replay_elem = buttons[1];
		this.customize_elem.addEventListener("click", () => this.returnToCustomization(), false);
		this.replay_elem.addEventListener("click", () => this.restartGame(), false);
		this.reset();
	}
	
	reset() {
		this.firstPlayer;
		this.currPlayer = null;
		
		this.gameStart = [];
		this.roundStart = [];
		this.roundEnd = [];
		this.turnStart = [];
		this.turnEnd = [];
		
		this.roundCount = 0;
		this.roundHistory = [];
		
		this.randomRespawn = false;
		this.doubleSpyPower = false;
		
		weather.reset();
		board.row.forEach(r => r.reset());
	}
	
	// Sets up player faction abilities and psasive leader abilities
	initPlayers(p1, p2){
		let l1 = ability_dict[p1.leader.abilities[0]];
		let l2 = ability_dict[p2.leader.abilities[0]];
		if (l1 === ability_dict["emhyr_whiteflame"] || l2 === ability_dict["emhyr_whiteflame"]){
			p1.disableLeader();
			p2.disableLeader();
		} else {
			initLeader(p1, l1);
			initLeader(p2, l2);
		}
		if (p1.deck.faction === p2.deck.faction && p1.deck.faction === "scoiatael")
			return;
		initFaction(p1);
		initFaction(p2);
		
		function initLeader(player, leader){
			if (leader.placed)
				leader.placed(player.leader);
			Object.keys(leader).filter(key => game[key]).map(key => game[key].push(leader[key]));
		}
		
		function initFaction(player){
			if (factions[player.deck.faction] && factions[player.deck.faction].factionAbility)
				factions[player.deck.faction].factionAbility(player);
		}
	}
	
	// Initializes player abilities, hands and waits for cointoss
	async startGame() {
		gameStartControlsElem.classList.add("hide");
		isOpponentReadyElem.classList.add("hidden");
		ui.toggleMusic_elem.style.left = "26vw"

		ui.toggleMusic_elem.classList.remove("music-customization");
		this.currPlayer = player_me;
		this.initPlayers(player_me, player_op);
		console.log("start game players:", player_me, player_op);
		var meleadercardloss = player_me.leader.abilities[0] === "nilf_drawmaster" ? nilfard_drawmaster.cardban : 0;
		var cardspecialgain = 0;
		console.log("On game start i lose cards:", meleadercardloss);
		var gamestart_thishandsize = thishandsize + cardspecialgain - meleadercardloss;
		console.log("End game start hannd size", gamestart_thishandsize);
		await Promise.all([...Array(gamestart_thishandsize).keys()].map( async () => {
			await player_me.deck.draw(player_me.hand);
			// await player_op.deck.draw(player_op.hand);
		}));
		var op_meleadercardloss = player_op.leader.abilities[0] === "nilf_drawmaster" ? nilfard_drawmaster.cardban : 0;
		var op_cardspecialgain = cardspecialgain;
		console.log("On game start op lose cards:", op_meleadercardloss);
		var op_gamestart_thishandsize = thishandsize + op_cardspecialgain - op_meleadercardloss;
		console.log("End game start hannd size", op_gamestart_thishandsize);
		await Promise.all([...Array(op_gamestart_thishandsize).keys()].map( async () => {
			// await player_me.deck.draw(player_me.hand);
			await player_op.deck.draw(player_op.hand);
		}));
		
		try {
			eval(ongame_start_eval);
		} catch (e) {
			console.log("Game eval start fail", e);
		}


		await this.runEffects(this.gameStart);
		tocar("game_opening", false);
		if (player_op.deck.faction === "scoiatael" && player_me.deck.faction !== "scoiatael") {
			await new Promise((resolve) => {
				const handleMessage = async (event) => {
					const data = await recv_and_decomp(event);
console.log("Player op have a Squirrel leader, waiting for msg", event);
					if (data.type === "scoiataelStart") {
						console.log("Is who start info vs Squirrel");
						const player = data.first === "me" ? player_op : player_me;
						game.firstPlayer = player;
						game.currPlayer = player;
						socket.removeEventListener('message', handleMessage);
						resolve(true);
					}
				}
				socket.addEventListener('message', handleMessage);
			});

			comp_and_send(socket, JSON.stringify({ type: 'gameStart' }));
			await this.initialRedraw();
		} else if (player_me.deck.faction === "scoiatael" && player_op.deck.faction !== "scoiatael") {
			comp_and_send(socket, JSON.stringify({ type: 'gameStart' }));
	
			await this.initialRedraw();
		} else {
			comp_and_send(socket, JSON.stringify({ type: 'gameStart' }));
			await this.coinToss();
	
			await this.initialRedraw();
		}
	}
	
	// Determines who starts first
	async coinToss() {
		return new Promise((resolve) => {
			const handleMessage = async (event) => {
				
				const data = await recv_and_decomp(event);

				if (data.type === 'coinToss') {
					let player;
					if (data.player === playerId) {
						player = player_me;
						passButton.classList.remove("hidden");
						document.addEventListener('keydown', handleKeyDown);
						document.addEventListener('keyup', handleKeyUp);
					} else {
						player = player_op;
					}
					game.firstPlayer = player;
					game.currPlayer = player;
					
					socket.removeEventListener('message', handleMessage);
					await ui.notification(game.firstPlayer.tag + "-coin", ui_display_times.coin);
					resolve(true);
				}
			}
			socket.addEventListener('message', handleMessage);
		});
	}
	
	// Allows the player to swap out up to two cards from their iniitial hand
	async initialRedraw(){
		var nilfard_drawmaster_draws = player_me.leader.abilities[0] === "nilf_drawmaster" ? nilfard_drawmaster.drawextra : 0;
		var OnGameStartDraw2 = OnGameStartDraw + nilfard_drawmaster_draws;
		if (debug == true)
			await ui.queueCarousel(player_me.hand, OnGameStartDraw2, async (c, i) => await player_me.deck.swap(c, c.removeCard(i)), c => true, true, true, `Choose up to ${OnGameStartDraw2} cards to redraw.`);
		else
			await ui.queueCarousel(player_me.hand, OnGameStartDraw2, async (c, i) => await player_me.deck.swap(c, c.removeCard(i)), c => true, true, true, `Choose up to ${OnGameStartDraw2} cards to redraw.`);
		ui.enablePlayer(false);

		comp_and_send(socket, JSON.stringify({ type: "initial_reDraw", hand: removeCircularReferences(player_me.hand.cards), deck: removeCircularReferences(player_me.deck.cards) }));
	}
	
	// Initiates a new round of the game
	async startRound(){
		this.roundCount++;
		this.currPlayer = (this.roundCount%2 === 0) ? this.firstPlayer : this.firstPlayer.opponent();
		player_me.setPassed(false);
		player_op.setPassed(false); //tried reset to resolve desync //Update it worked, ez
		await this.runEffects(this.roundStart);
		
		if ( !player_me.canPlay() )
			player_me.setPassed(true);
		if ( !player_op.canPlay() )
			player_op.setPassed(true);
		
		if (player_op.passed && player_me.passed)
			return this.endRound();
		
		if (this.currPlayer.passed)
			this.currPlayer = this.currPlayer.opponent();
		
		await ui.notification("round-start", ui_display_times.round_start);
		if (this.currPlayer.opponent().passed)
			await ui.notification(this.currPlayer.tag + "-turn", ui_display_times.turn);
		
		this.startTurn();
	}
	
	// Starts a new turn. Enables client interraction in client's turn.
	async startTurn() {
		await this.runEffects(this.turnStart);
		if (!this.currPlayer.opponent().passed){
			this.currPlayer = this.currPlayer.opponent();
			ui.notification(this.currPlayer.tag + "-turn", ui_display_times.turn);
		}
		if (this.currPlayer === player_me) {
			passButton.classList.remove("hidden");
			document.addEventListener('keydown', handleKeyDown);
			document.addEventListener('keyup', handleKeyUp);
			ui.enablePlayer(true);
		} else {
			passButton.classList.add("hidden");
			document.removeEventListener('keydown', handleKeyDown);
			document.removeEventListener('keyup', handleKeyUp);
		}
		
		this.currPlayer.startTurn();
	}
	
	// Ends the current turn and may end round. Disables client interraction in client's turn.
	async endTurn() {
		if (this.currPlayer === player_me)
			ui.enablePlayer(false);
		await this.runEffects(this.turnEnd);
		if (this.currPlayer.passed)
			await ui.notification(this.currPlayer.tag + "-pass", ui_display_times.pass);
		if (player_op.passed && player_me.passed)
			this.endRound();
		else
			this.startTurn();
	}
	
	// Ends the round and may end the game. Determines final scores and the round winner.
	async endRound() {
		let dif = player_me.total - player_op.total;
		if (dif === 0) {
			let nilf_me = player_me.deck.faction === "nilfgaard", nilf_op = player_op.deck.faction === "nilfgaard";
			dif = nilf_me ^ nilf_op ? nilf_me ? 1 : -1 : 0;
		}
		let winner = dif > 0 ? player_me : dif < 0 ? player_op : null;
		let verdict = {winner: winner, score_me: player_me.total, score_op: player_op.total}
		this.roundHistory.push(verdict);
		
		await this.runEffects(this.roundEnd);
		
		board.row.forEach( row => row.clear() );
		weather.clearWeather();
		
		player_me.endRound( dif > 0);
		player_op.endRound( dif < 0);
		
		if (dif > 0)
			await ui.notification("win-round", ui_display_times.round_end_result);
		else if (dif < 0)
			await ui.notification("lose-round", ui_display_times.round_end_result);
		else
			await ui.notification("draw-round", ui_display_times.round_end_result);
		
		if (player_me.health === 0 || player_op.health === 0)
			this.endGame();
		else
			this.startRound();
	}
	
	// Sets up and displays the end-game screen
	async endGame() {
		readyButtonElem.classList.remove("ready");
		let endScreen = document.getElementById("end-screen");
		let rows = endScreen.getElementsByTagName("tr");
		rows[1].children[0].innerHTML = player_me.name;
		rows[2].children[0].innerHTML = player_op.name;
		
		for (let i=1; i<4; ++i) {
			let round = this.roundHistory[i-1];
			rows[1].children[i].innerHTML = round ? round.score_me : 0;
			rows[1].children[i].style.color = round && round.winner === player_me ? "goldenrod" : "";
			
			rows[2].children[i].innerHTML = round ? round.score_op : 0;
			rows[2].children[i].style.color = round && round.winner === player_op ? "goldenrod" : "";
		}
		
		endScreen.children[0].className = "";
		console.log("---------------------")
		if (player_op.health <= 0 && player_me.health <= 0) {
			tocar("");
			endScreen.getElementsByTagName("p")[0].classList.remove("hide");
			endScreen.children[0].classList.add("end-draw");
			tocar("game_draw", true);
			console.log("Game over || Draw")
		} else if (player_op.health === 0){
			tocar("game_win", true);
			endScreen.children[0].classList.add("end-win");
			console.log("Game over || Victory")
		} else {
			endScreen.children[0].classList.add("end-lose");
			endScreen.children[0].classList.add("end-lose");
			console.log("Game over || Victory")
		}
		
		fadeIn(endScreen, 300);
		ui.enablePlayer(true);
	}
	
	// Returns the client to the deck customization screen
	returnToCustomization(){
		comp_and_send(socket, JSON.stringify({ type: "unReady" }));
		amReady = false;
		opponentReady = false;
		readyButtonElem.classList.remove("ready");
		
		ui.toggleMusic_elem.style.left = "20.5vw"

		this.reset();
		player_me.reset();
		player_op.reset();
		ui.toggleMusic_elem.classList.add("music-customization");
		this.endScreen.classList.add("hide");
		customizationElem.classList.remove("hide");
		gameStartControlsElem.classList.remove("hide");
	}
	
	// Restarts the last game with the same decks
	restartGame(){
		this.reset();
		player_me.reset();
		player_op.reset();
		this.endScreen.classList.add("hide");
		this.startGame();
	}
	
	// Executes effects in list. If effect returns true, effect is removed.
	async runEffects(effects){
		for (let i = effects.length - 1; i >= 0; --i){
			let effect = effects[i];
			if (await effect())
				effects.splice(i,1)
		}
	}
	
}

// Contains information and behavior of a Card
class Card {

	constructor(card_data, player) {
		this.name = card_data.name;
		this.basePower = this.power = Number(card_data.strength);
		this.faction = card_data.deck;
		this.abilities = (card_data.ability === "") ? [] : card_data.ability.split(" ");
		this.row = (card_data.deck === "weather") ? card_data.deck : card_data.row;
		this.filename = card_data.filename;
		this.placed = [];
		this.removed = [];
		this.activated = [];
		this.holder = player;
		
		this.hero = false;
		if (this.abilities.length > 0) {
			if (this.abilities[0] === "hero") {
				this.hero = true;
				this.abilities.splice(0, 1);
			}
			for (let x of this.abilities) {
				let ab = ability_dict[x];
				if ("placed" in ab) this.placed.push(ab.placed);
				if ("removed" in ab) this.removed.push(ab.removed);
				if ("activated" in ab) this.activated.push(ab.activated);
			}
		}
		
		if (this.row === "leader")
			this.desc_name = "Leader Ability";
		else if (this.abilities.length > 0)
			this.desc_name = ability_dict[this.abilities[this.abilities.length-1]].name;
		else if (this.row==="agile")
			this.desc_name = "agile";
		else if (this.hero)
			this.desc_name = "hero";
		else
			this.desc_name = "";
		
		this.desc = this.row ==="agile" ? ability_dict["agile"].description : "";
		for (let i=this.abilities.length-1; i>=0; --i) {
			this.desc += ability_dict[this.abilities[i]].description;
		}
		if (this.hero)
			this.desc += ability_dict["hero"].description;
		
		this.elem = this.createCardElem(this);
	}
	
	// Returns the identifier for this type of card
	id() {
		return this.name;
	}
	
	// Sets and displays the current power of this card
	setPower(n){
		if (this.name === "Decoy")
			return;
		let elem = this.elem.children[0].children[0];
		if (n !== this.power) {
			this.power = n;
			elem.innerHTML = this.power;
		}
		elem.style.color = (n>this.basePower) ? "goldenrod" : (n<this.basePower) ? "red" : "";
	}
	
	// Resets the power of this card to default
	resetPower(){
		this.setPower(this.basePower);
	}
	
	// Automatically sends and translates this card to its apropriate row from the passed source
	async autoplay(source){
		await board.toRow(this, source);
	}
	
	// Animates an ability effect
	async animate(name, bFade = true, bExpand = true) {
		var guia = {
			"medic" : "med",
			"muster" : "ally",
			"morale" : "moral",
			"bond" : "moral"
		}
		var temSom = new Array();
		for (var x in guia) temSom[temSom.length] = x;
		var literais = ["scorch", "spy", "horn", "shield", "lock", "seize", "knockback", "resilience"];
		var som = literais.indexOf(name) > -1 ? literais[literais.indexOf(name)] : temSom.indexOf(name) > -1 ? guia[name] : "";
		if (som != "") tocar(som, false);

		if (name === "scorch") {
			return await this.scorch(name);
		}
		let anim = this.elem.children[3];
		anim.style.backgroundImage = iconURL("anim_" + name);
		await sleep(50);
		
		if (bFade) fadeIn(anim, 300);
		if (bExpand) anim.style.backgroundSize = "100% auto";
		await sleep(300);
		
		if (bExpand) anim.style.backgroundSize = "80% auto";
		await sleep(1000);
		
		if (bFade) fadeOut(anim, 300);
		if (bExpand) anim.style.backgroundSize = "40% auto";
		await sleep(300);
		
		anim.style.backgroundImage = "";
	}
	
	// Animates the scorch effect
	async scorch(name){
		let anim = this.elem.children[3];
		anim.style.backgroundSize = "cover";
		anim.style.backgroundImage = iconURL("anim_" + name);
		await sleep(50);
		
		fadeIn(anim, 300);
		await sleep(1300);
		
		fadeOut(anim, 300);
		await sleep(300);
		
		anim.style.backgroundSize = "";
		anim.style.backgroundImage = "";
	}
	
	// Returns true if this is a combat card that is not a Hero
	isUnit(){
		return !this.hero && (this.row === "close" || this.row === "ranged" || this.row === "siege" || this.row === "agile");
	}
	
	// Returns true if card is sent to a Row's special slot
	isSpecial() {
		return this.name === "Commander's Horn" || this.name === "Mardroeme";
	}

	// Compares by type then power then name
	static compare(a, b){
		var dif = factionRank(a) - factionRank(b);
		if (dif !== 0)
			return dif;
		dif = a.basePower - b.basePower;
		if (dif && dif !== 0)
			return dif;
		return a.name.localeCompare(b.name);
		
		function factionRank(c){ return c.faction === "special" ? -2 : (c.faction === "weather") ? -1 : 0; }
	}
	
	// Creates an HTML element based on the card's properties
	createCardElem(card){
		console.log("createcardElem", card);
		let elem = document.createElement("div");
		elem.style.backgroundImage = smallURL(card.faction + "_" + card.filename);
		elem.classList.add("card");
		elem.addEventListener("click", () => ui.selectCard(card), false);
		
		if (card.row === "leader")
			return elem;
		
		let power = document.createElement("div");
		elem.appendChild(power);
		let bg;
		if (card.hero) {
			bg = "power_hero";
			elem.classList.add("hero");
		} else if (card.faction === "weather") {
			bg = "power_" + card.abilities[0];
		} else if (card.faction === "special") {
			bg = "power_" + card.abilities[0];
			elem.classList.add("special");
		} else {
			bg = "power_normal";
		}
		power.style.backgroundImage = iconURL(bg);
		
		let row = document.createElement("div");
		elem.appendChild(row);
		if (card.row === "close" || card.row === "ranged" || card.row === "siege" || card.row === "agile") {
			let num = document.createElement("div");
			num.appendChild( document.createTextNode(card.basePower) );
			num.classList.add("center");
			power.appendChild(num);
			row.style.backgroundImage = iconURL("card_row_" + card.row);
		}

		let abi = document.createElement("div");
		elem.appendChild(abi);
		if (card.faction !== "special" && card.faction !== "weather" && card.abilities.length > 0) {
			let str =  card.abilities[card.abilities.length-1];
			if (str === "cerys")
				str = "muster";
			if (str.startsWith("avenger"))
				str = "avenger";
			if (str === "scorch_c" || str == "scorch_r" || str === "scorch_s")
				str = "scorch";
			abi.style.backgroundImage = iconURL("card_ability_" + str);
		} else if (card.row === "agile")
			abi.style.backgroundImage = iconURL("card_ability_" + "agile");
		
		elem.appendChild( document.createElement("div") ); // animation overlay
		console.log("createcardElem out", elem)
		return elem;
	}
}

// Handles notifications and client interration with menus
class UI {
	constructor() {
		this.carousels = [];
		this.notif_elem = document.getElementById("notification-bar");
		this.preview = document.getElementsByClassName("card-preview")[0];
		this.previewCard = null;
		this.lastRow = null;
		passButton.addEventListener("click", () => {
			comp_and_send(socket, JSON.stringify({ type: "pass", player: playerId }));
			player_me.passRound();
		});
		document.getElementById("click-background").addEventListener("click", () => ui.cancel(), false);
		this.youtube;
		this.ytActive;
		this.toggleMusic_elem = document.getElementById("toggle-music");
		this.toggleMusic_elem.classList.add("fade");
		this.toggleMusic_elem.addEventListener("click", () => this.toggleMusic(), false);
	}
	
	enablePlayer(enable){
		let main = document.getElementsByTagName("main")[0].classList;
		if (enable) main.remove("noclick"); else main.add("noclick");
	}

	// Initializes the youtube background music object
	initYouTube() {
		this.youtube = new YT.Player('youtube', {
			videoId: audio_yt_vid_soundtrack,
			playerVars: {
				"autoplay": 1,
				"controls": 0,
				"loop": 1,
				"playlist": audio_yt_vid_soundtrack,
				"rel": 0,
				"version": 3,
				"modestbranding": 1
			},
			events: {
				'onStateChange': initButton,
				 onReady: (event) => {
				event.target.setVolume( audio_yt_vid_soundtrack_volume);
				 }
			}
		});

		function initButton() {
			if (ui.ytActive !== undefined)
				return;
			ui.ytActive = true;
			ui.youtube.playVideo();
			let timer = setInterval(() => {
				if (ui.youtube.getPlayerState() !== YT.PlayerState.PLAYING)
					ui.youtube.playVideo();
				else {
					clearInterval(timer);
					ui.toggleMusic_elem.classList.remove("fade");
				}
			}, 500);
		}
	}

	// Called when client toggles the music
	toggleMusic() {
		if (this.youtube.getPlayerState() !== YT.PlayerState.PLAYING) iniciarMusica();
		else {
			this.youtube.pauseVideo();
			this.toggleMusic_elem.classList.add("fade");
		}
	}

	// Enables or disables backgorund music 
	setYouTubeEnabled(enable) {
		if (this.ytActive === enable)
			return;
		if (enable && !this.mute)
			ui.youtube.playVideo();
		else
			ui.youtube.pauseVideo();
		this.ytActive = enable;
	}
	
	// Called when the player selects a selectable card
	async selectCard(card) {
		let row = this.lastRow;
		let pCard = this.previewCard;
		if (card === pCard)
			return;
		if (pCard === null || card.holder.hand.cards.includes(card)) {
			this.setSelectable(null, false);
			this.showPreview(card);
		} else if (pCard.name === "Decoy") {
			const nomeColuna = this.lastRow.elem_parent.id	
			const playedCard = removeCircularReferences(this.previewCard);
			const targetCard = removeCircularReferences(card);

			console.log("You played the card", this.previewCard)
			comp_and_send(socket, JSON.stringify({ type: "play", player: playerId, card: playedCard, row: nomeColuna, target: targetCard }));
			
			this.hidePreview(card);
			this.enablePlayer(false);
			board.toHand(card, row);
			await board.moveTo(pCard, row, pCard.holder.hand);
			pCard.holder.endTurn();
		}
	}
	
	// Called when the player selects a selectable CardContainer
	// LEO - aqui de fato coloca a carta na coluna.
	async selectRow(row, opponentCard = null){
		this.lastRow = row;

		if (this.previewCard === null && opponentCard === null) {
			await ui.viewCardsInContainer(row);
			return;
		}

		const nomeColuna = this.lastRow.elem.id === "weather" ? this.lastRow.elem.id : this.lastRow.elem_parent.id
		const playedCard = removeCircularReferences(this.previewCard || opponentCard);

		console.log("You played the card", this.previewCard)
		if (this.previewCard.name === "Decoy")
			return;

		comp_and_send(socket, JSON.stringify({ type: "play", player: playerId, card: playedCard, row: nomeColuna}));

		let card = this.previewCard || opponentCard;
		let holder = card.holder;
		this.hidePreview();
		this.enablePlayer(false);
		if (card.name === "Scorch"){
			this.hidePreview();
			await ability_dict["scorch"].activated(card);
		} else if (card.name === "Decoy") {
			return;
		} else {
			await board.moveTo(card, row, card.holder.hand);
		}
		holder.endTurn();
	}
	
	// Called when the client cancels out of a card-preview
	cancel(){
		tocar("discard", false);
		this.hidePreview();
	}
	
	// Displays a card preview then enables and highlights potential card destinations
	showPreview(card) {
		tocar("explaining", false);
		this.showPreviewVisuals(card);
		this.setSelectable(card, true);
		document.getElementById("click-background").classList.remove("noclick");
	}
	
	// Sets up the graphics and description for a card preview
	showPreviewVisuals(card){
		this.previewCard = card;
		this.preview.classList.remove("hide");
		this.preview.getElementsByClassName("card-lg")[0].style.backgroundImage = largeURL(card.faction+"_"+card.filename);
		let desc_elem = this.preview.getElementsByClassName("card-description")[0];
		this.setDescription(card, desc_elem);
	}
	
	// Hides the card preview then disables and removes highlighting from card destinations
	hidePreview(){
		document.getElementById("click-background").classList.add("noclick");
		player_me.hand.cards.forEach( c => c.elem.classList.remove("noclick") );
		
		this.preview.classList.add("hide");
		this.setSelectable(null, false);
		this.previewCard = null;
		this.lastRow = null;
	}
	
	// Sets up description window for a card
	setDescription(card, desc){
		if (card.hero || card.row === "agile" || card.abilities.length > 0 || card.faction === "faction") {
			desc.classList.remove("hide");
			let str = card.row === "agile" ? "agile" : "";
			if (card.abilities.length)
				str = card.abilities[card.abilities.length-1];
			if (str === "cerys")
				str = "muster";
			if (str.startsWith("avenger"))
				str = "avenger";
			if (str === "scorch_c" || str == "scorch_r" || str === "scorch_s")
				str = "scorch";
			if (card.row === "leader" || card.faction === "faction" || card.abilities.length === 0 && card.row !== "agile")
				desc.children[0].style.backgroundImage = "";
			else
				desc.children[0].style.backgroundImage = iconURL("card_ability_" + str);
			desc.children[1].innerHTML = card.desc_name;
			desc.children[2].innerHTML = card.desc;
		} else {
			desc.classList.add("hide");
		}
	}

async waitNotificationsDone() {
    console.log("[notif] WAIT START");
	console.log("[notif]: check config:", ui_display_times.hold_pause.sleep, ui_display_times.hold_pause.needs);
    let consecutiveTrueCount = 0;
    const requiredConsecutive = ui_display_times.hold_pause.needs;

    while (true) {
        const isDone =
            ui_display_times.queue.length === 0 &&
            !ui_display_times.is_busy &&
            !ui_display_times.is_transitioning;

        if (isDone) {
            consecutiveTrueCount++;
            console.log(`[notif] check: condition true (${consecutiveTrueCount}/${requiredConsecutive})`);
        } else {
            consecutiveTrueCount = 0;
            console.log("[notif] check: condition false, reset counter");
        }

        if (consecutiveTrueCount >= requiredConsecutive) {
            break; // exit loop after 10 consecutive true checks
        }
		 console.log(`[notif] check: sleeps`);
        await sleep(ui_display_times.hold_pause.sleep);
		console.log(`[notif] check: sleeped`);
    }
    console.log("[notif] WAIT DONE");
}

async notification(name, duration) {
    console.log("[notif] notification() CALL:", name, duration);

    if (!duration) duration = ui_display_times.notyfication;
    duration = Math.max(800, duration);

    // SOUND mapping
    const guia2 = {
			"me-pass" : "pass",
			"win-round" : "round_win",
			"draw-round": "round_lose",
			"lose-round" : "round_lose",
			"me-turn" : "turn_me",
			"op-turn" : "turn_op",
			"op-leader" : "turn_op",
			"op-white-flame" : "turn_op",
			"nilfgaard-wins-draws" : "turn_op",
			"sv-err": "server_error",
			"win-opleft" : "round_win", // "opponent_left",
			"round-start": "round1_start"
		};

    const temSom = Object.keys(guia2);
    const som =
        temSom.includes(name)
            ? guia2[name]
            : name === "round-start" && game.roundHistory.length === 0
            ? "round1_start"
            : "";
console.log("[notif]: value to play", som);
    if (som !== "") {
        console.log("[notif] PLAY SOUND:", som);
        tocar(som, false);
    } else {
        console.log("[notif] NO SOUND FOR:", name);
    }

    // Add notification to queue
    ui_display_times.queue.push({
        name: name,
        duration: duration,
        time: Date.now()
    });

    console.log("[notif] QUEUE PUSHED:", name, "queue size:", ui_display_times.queue.length);

    // Start notification loop if not already running
    this.notificationLoop();

    // Wait until all notifications are finished
    await this.waitNotificationsDone();

    console.log("[notif] notification() RETURN:", name);
}

async notificationLoop() {
    if (ui_display_times.is_running) {
     //   console.log("[notif] notificationLoop already running");
        return;
    }

    ui_display_times.is_running = true;
    console.log("[notif] notificationLoop START");

    while (true) {
        if (
            !ui_display_times.is_busy &&
            !ui_display_times.is_transitioning &&
            ui_display_times.queue.length > 0
        ) {
            ui_display_times.is_busy = true;

            const item = ui_display_times.queue.shift();
            console.log("[notif] SHOW:", item.name, "queue left:", ui_display_times.queue.length);

            try {
                const fadeSpeed = ui_display_times.fadeSpeed;

                // Show notification
                ui_display_times.is_transitioning = true;
                this.notif_elem.classList.remove("hide");
                this.notif_elem.style.display = "";
                this.notif_elem.style.opacity = 0;

                this.notif_elem.children[0].id = "notif-" + item.name;

                console.log("[notif] fadeIn:", item.name);
                await fadeIn(this.notif_elem, fadeSpeed);
                console.log("[notif] fadeIn complete:", item.name);

                // Wait for display duration
                await sleep(item.duration);

                console.log("[notif] fadeOut:", item.name);
                ui_display_times.is_transitioning = true;
                await fadeOut(this.notif_elem, fadeSpeed);
                console.log("[notif] fadeOut complete:", item.name);

                // Reset state after fade out
                this.notif_elem.classList.add("hide");
                this.notif_elem.style.display = "none";
                this.notif_elem.style.opacity = 0;

                console.log("[notif] DONE:", item.name);
            } catch (e) {
                console.error("[notif] ERROR:", e);
                ui_display_times.is_transitioning = false;
            }
			console.log("[notif] done down here notif too")
            ui_display_times.is_busy = false;
			console.log("[notif] Notif to unpause is_transitioning sleeps for", ui_display_times.checkDelay * 2.3)
        await sleep(ui_display_times.fadeSpeed * 2.3);
		ui_display_times.is_transitioning = false;
		console.log("[notif]: ui_display_times.is_transitioning = false;", ui_display_times.is_transitioning);
        }
		await sleep(ui_display_times.checkDelay);
    }
}
	
	// Displays a cancellable Carousel for a single card 
	async viewCard(card, action) {
		if (card === null)
			return;
		let container = new CardContainer();
		container.cards.push(card);
		await this.viewCardsInContainer(container, action);
	}
	
	// Displays a cancellable Carousel for all cards in a container
	async viewCardsInContainer(container, action) {
		action = action ? action : function() { return this.cancel();};

		await this.queueCarousel(container, 1, action, () => true, false, true);
		comp_and_send(socket, JSON.stringify({ type: "containerClosed" }));
	}
	
	// Displays a Carousel menu of filtered container items that match the predicate.
	// Suspends gameplay until the Carousel is closed.
	async queueCarousel(container, count, action, predicate, bSort, bQuit, title){
		let carousel = new Carousel(container, count, action, predicate, bSort, bQuit, title);
		if (Carousel.curr === undefined || Carousel.curr === null)
			carousel.start();
		else {
			this.carousels.push(carousel);
			return;
		}
		await sleepUntil( () => this.carousels.length === 0 && !Carousel.curr, 100);
	}
	
	// Starts the next queued Carousel
	quitCarousel(){
		if (this.carousels.length > 0) {
			this.carousels.shift().start();
		}
	}
	
	// Displays a custom confirmation menu 
	async popup(yesName, yes, noName, no, title, description) {
		let p = new Popup(yesName, yes, noName, no, title, description);
		await sleepUntil( () => !Popup.curr) 
	}
	
	// Enables or disables selection and highlighting of rows specific to the card
	setSelectable(card, enable){
		if(!enable) {
			for (let row of board.row){
				row.elem.classList.remove("row-selectable");
				row.elem.classList.remove("noclick");
				row.elem_special.classList.remove("row-selectable");
				row.elem_special.classList.remove("noclick");
				row.elem.classList.add("card-selectable");
				
				for (let card of row.cards) {
					card.elem.classList.add("noclick");
				}
			}
			weather.elem.classList.remove("row-selectable");
			weather.elem.classList.remove("noclick");
			return;
		}
		if (card.faction === "weather") {
			for (let row of board.row){
				row.elem.classList.add("noclick");
				row.elem_special.classList.add("noclick");
			}
			weather.elem.classList.add("row-selectable");
			return;
		}
		
		weather.elem.classList.add("noclick");
		
		if (card.name === "Scorch") {
			for (let r of board.row){
				r.elem.classList.add("row-selectable");
				r.elem_special.classList.add("row-selectable");
			}
			return;
		}
		if (card.isSpecial()){
			for (let i=0; i<6; i++){
				let r = board.row[i];
				if (i < 3 || r.special !== null){
					r.elem.classList.add("noclick");
					r.elem_special.classList.add("noclick");
				} else {
					r.elem_special.classList.add("row-selectable");
				}
			}
			return;
		}
		
		board.row.forEach( r => r.elem_special.classList.add("noclick") );
		
		if (card.name === "Decoy"){
			for (let i=0; i<6; ++i) {
				let r = board.row[i];
				let units = r.cards.filter(c => c.isUnit());
				if (i < 3 || units.length === 0) {
					r.elem.classList.add("noclick");
					r.elem_special.classList.add("noclick");
					r.elem.classList.remove("card-selectable");
				} else {
					r.elem.classList.add("row-selectable");
					units.forEach( c => c.elem.classList.remove("noclick") );
				}
			}
			return;
		}
		
		let currRows = card.row === "agile" ? [board.getRow(card, "close", card.holder), board.getRow(card, "ranged", card.holder)] : [board.getRow(card, card.row, card.holder)];
		for (let i=0; i<6; i++){
			let row = board.row[i];
			if (currRows.includes(row)) {
				row.elem.classList.add("row-selectable");
			} else {
				row.elem.classList.add("noclick");
			}
		}
	
	}
}

// Displays up to 5 cards for the client to cycle through and select to perform an action
// Clicking the middle card performs the action on that card "count" times
// Clicking adejacent cards shifts the menu to focus on that card
class Carousel {
	constructor(container, count, action, predicate, bSort, bExit = false, title) {
		if (count <= 0 || !container || !action || container.cards.length === 0)
			return ;
		this.container = container;
		this.count = count;
		this.action = action ? action : () => this.cancel();
		this.predicate = predicate;
		this.bSort = bSort;
		this.indices = [];
		this.index = 0;
		this.bExit = bExit;
		this.title = title;
		this.cancelled = false;
		
		if (!Carousel.elem) {
			Carousel.elem = document.getElementById("carousel");
			Carousel.elem.children[0].addEventListener("click", () => Carousel.curr.cancel(), false);
		}
		this.elem = Carousel.elem;
		document.getElementsByTagName("main")[0].classList.remove("noclick");
		
		this.elem.children[0].classList.remove("noclick");
		this.previews = this.elem.getElementsByClassName("card-lg");
		this.desc = this.elem.getElementsByClassName("card-description")[0];
		this.title_elem = this.elem.children[2];
	}
	
	// Initializes the current Carousel
	start(){
		if (!this.elem)
			return;
		this.indices = this.container.cards.reduce((a,c,i)=> (!this.predicate || this.predicate(c)) ? a.concat([i]) : a, []);
		if (this.indices.length <= 0)
			return this.exit();
		if (this.bSort)
			this.indices.sort( (a, b) => Card.compare(this.container.cards[a],this.container.cards[b]) );
		
		this.update();
		Carousel.setCurrent(this);
		
		if (this.title) {
			this.title_elem.innerHTML = this.title;
			this.title_elem.classList.remove("hide");
		} else {
			this.title_elem.classList.add("hide");
		}
		
		this.elem.classList.remove("hide");
		ui.enablePlayer(true);
		tocar("explaining", false);
	}
	
	// Called by the client to cycle cards displayed by n
	shift(event, n){
		(event || window.event).stopPropagation();
		this.index = Math.max(0, Math.min(this.indices.length-1, this.index+n));
		this.update();
	}
	
	// Called by client to perform action on the middle card in focus
	async select(event) {
		(event || window.event).stopPropagation();
		--this.count;
		if (this.isLastSelection())
			this.elem.classList.add("hide");
		if (this.count <= 0)
			ui.enablePlayer(false);
	
		const actionString = this.action.toString()
		tocar("redraw", false);
		const resp = await this.action(this.container, this.indices[this.index]);

		if (actionString === "(c, i) => wrapper.card=c.cards[i]" || actionString === "(c,i) => newCard = c.cards[i]") {
			setTimeout(() => {
				comp_and_send(socket, JSON.stringify({ type: "medicDraw", card: resp.filename }));
			}, 1000);
		} else if (actionString.includes("board.toWeather")) {
			setTimeout(() => {
				comp_and_send(socket, JSON.stringify({ type: "weatherDraw", card: resp.filename }));
			}, 1000);
		} else if (actionString.includes("board.toGrave")) {
			setTimeout(() => {
				comp_and_send(socket, JSON.stringify({ type: "removeCardHand", card: resp.filename }));
			}, 1000);
		} else if (actionString.includes("board.toHand")) {
			setTimeout(() => {
				comp_and_send(socket, JSON.stringify({ type: "addCardHand", card: resp.filename  }));
			}, 1000);
		}
		if (this.isLastSelection() && !this.cancelled)
			return this.exit();
		this.update();
	}
	
	// Called by client to exit out of the current Carousel if allowed. Enables player interraction.
	cancel(){
		if (this.bExit){
			this.cancelled = true;
			tocar("discard", false);
			this.exit();
		}
		ui.enablePlayer(true);
	}
	
	// Returns true if there are no more cards to view or select
	isLastSelection(){
		return this.count <= 0 || this.indices.length === 0;
	}
	
	// Updates the visuals of the current selection of cards
	update(){
		this.indices = this.container.cards.reduce((a,c,i)=> (!this.predicate || this.predicate(c)) ? a.concat([i]) : a, []);
		if (this.index >= this.indices.length)
			this.index =  this.indices.length-1;
		for (let i=0; i<this.previews.length; i++) {
			let curr = this.index - 2 + i;
			if (curr >= 0 && curr < this.indices.length) {
				let card = this.container.cards[this.indices[curr]];
				this.previews[i].style.backgroundImage = largeURL(card.faction + "_" + card.filename);
				this.previews[i].classList.remove("hide");
				this.previews[i].classList.remove("noclick");
			} else {
				this.previews[i].style.backgroundImage = "";
				this.previews[i].classList.add("hide");
				this.previews[i].classList.add("noclick");
			}
		}
		ui.setDescription(this.container.cards[this.indices[this.index]], this.desc);
	}
	
	// Clears and quits the current carousel
	exit() {
		for (let x of this.previews)
			x.style.backgroundImage = "";
		this.elem.classList.add("hide");
		Carousel.clearCurrent();
		ui.quitCarousel();
	}
	
	// Statically sets the current carousel
	static setCurrent(curr) {
		this.curr = curr;
	}
	
	// Statically clears the current carousel
	static clearCurrent() {
		this.curr = null;
	}
}

// Custom confirmation windows
class Popup {
	constructor(yesName, yes, noName, no, header, description){
		this.yes = yes ? yes : ()=>{};
		this.no = no ? no : ()=>{};
		
		this.elem = document.getElementById("popup");
		let main = this.elem.children[0];
		main.children[0].innerHTML = header ? header : "";
		main.children[1].innerHTML = description ? description : "";
		main.children[2].children[0].innerHTML = (yesName) ? yesName : "Yes";
		main.children[2].children[1].innerHTML = (noName) ? noName : "No";
		
		this.elem.classList.remove("hide");
		Popup.setCurrent(this);
		ui.enablePlayer(true);
	}
	
	// Sets this as the current popup window
	static setCurrent(curr){ this.curr = curr; }
	
	// Unsets this as the current popup window
	static clearCurrent()  { this.curr = null; }
	
	// Called when client selects the positive aciton
	selectYes() {
		this.clear()
		this.yes();
		return true;
	}
	
	// Called when client selects the negative option
	selectNo() {
		this.clear();
		this.no();
		return false;
	}
	
	// Clears the popup and diables player interraction
	clear() {
		ui.enablePlayer(false);
		this.elem.classList.add("hide");
		Popup.clearCurrent();
	}
	
}



// Screen used to customize, import and export deck contents
class DeckMaker {
	constructor() {
		this.elem = customizationElem;
		this.bank_elem = document.getElementById("card-bank");
		this.deck_elem = document.getElementById("card-deck");
		this.leader_elem = document.getElementById("card-leader");
		this.leader_elem.children[1].addEventListener("click", () => this.selectLeader(), false);
		
		this.faction = "realms";
		this.setFaction(this.faction, true);
		
		let start_deck = premade_deck.find(d => d.faction === this.faction);
		start_deck.cards = start_deck.cards.map(c => ({index: c[0], count: c[1]}) );
		this.setLeader(start_deck.leader);
		this.makeBank(this.faction, start_deck.cards);
		
		this.change_elem = document.getElementById("change-faction");
		this.change_elem.addEventListener("click", () => this.selectFaction(), false);
		
		document.getElementById("download-deck").addEventListener("click", () => this.downloadDeck(), false);
		document.getElementById("add-file").addEventListener("change", () => this.uploadDeck(), false);
		readyButtonElem.addEventListener("click", () => this.startNewGame(), false);
		somCarta();
		
		this.update();
	}
	
	// Called when client selects a deck faction. Clears previous cards and makes valid cards available.
	setFaction(faction_name, silent){
		if (!silent && this.faction === faction_name)
			return false;
		if (!silent) {
			tocar("warning", false);
			if (!confirm("Changing factions will clear the current deck. Continue? ")) {
				tocar("warning", false);
				return false;
			}

			comp_and_send(socket, JSON.stringify({ type: "opChangeFaction", faction: faction_name }));
		}

		this.elem.getElementsByTagName("h1")[0].innerHTML = factions[faction_name].name;
		this.elem.getElementsByTagName("h1")[0].style.backgroundImage = iconURL("deck_shield_" + faction_name);
		document.getElementById("faction-description").innerHTML = factions[faction_name].description;
		
		this.leaders = 
			card_dict.map((c,i) => ({index: i, card:c}) )
			.filter(c => c.card.deck === faction_name && c.card.row === "leader");
		if (!this.leader || this.faction !== faction_name) {
			this.leader = this.leaders[0];
			this.leader_elem.children[1].style.backgroundImage = largeURL(this.leader.card.deck + "_" + this.leader.card.filename);
		}
		this.faction = faction_name;
		setTimeout(function() {
			somCarta();
		}, 300);
		return true;
	}
	
	// Called when client selects a leader for their deck
	setLeader(index){
		this.leader = this.leaders.find( l => l.index == index);
		this.leader_elem.children[1].style.backgroundImage = largeURL(this.leader.card.deck + "_" + this.leader.card.filename);
	}
	
	// Constructs a bank of cards that can be used by the faction's deck.
	// If a deck is provided, will not add cards to bank that are already in the deck.
	makeBank(faction, deck) {
		this.clear();
		let cards = card_dict.map((c,i) => ({card:c, index:i})).filter(
		p => [faction, "neutral", "weather", "special"].includes(p.card.deck) && p.card.row !== "leader");
		
		cards.sort( function(id1, id2) {
			let a = card_dict[id1.index], b = card_dict[id2.index];
			let c1 = {name: a.name, basePower: -a.strength, faction: a.deck};
			let c2 = {name: b.name, basePower: -b.strength, faction: b.deck};
			return Card.compare(c1, c2);
		});
		
		
		let deckMap = {};
		if (deck){
			for (let i of Object.keys(deck)) deckMap[deck[i].index] = deck[i].count;
		}
		cards.forEach( p => {
			let count = deckMap[p.index] !== undefined ? Number(deckMap[p.index]) : 0;
			this.makePreview(p.index, Number.parseInt(p.card.count) - count, this.bank_elem, this.bank,);
			this.makePreview(p.index, count, this.deck_elem, this.deck);
		});
	}
	
	// Creates HTML elements for the card previews
	makePreview(index, num, container_elem, cards){
		let card_data = card_dict[index];
		
		let elem = document.createElement("div");
		elem.style.backgroundImage = largeURL(card_data.deck + "_" + card_data.filename);
		elem.classList.add("card-lg");
		let count = document.createElement("div");
		elem.appendChild(count);
		container_elem.appendChild(elem);
		
		let bankID = {index: index, count: num, elem: elem};
		let isBank = cards === this.bank;
		count.innerHTML = bankID.count;
		cards.push(bankID);
		let cardIndex = cards.length-1;
		elem.addEventListener("click", () => this.select(cardIndex, isBank), false);

		return bankID;
	}
	
	// Updates the card preview elements when any changes are made to the deck
	update(){
		for (let x of this.bank) {
			if (x.count)
				x.elem.classList.remove("hide");
			else
				x.elem.classList.add("hide");
		}
		let total = 0, units = 0, special = 0, strength = 0, hero = 0;
		for (let x of this.deck) {
			let card_data = card_dict[x.index];
			if (x.count)
				x.elem.classList.remove("hide");
			else
				x.elem.classList.add("hide");
			total += x.count;
			if (card_data.deck === "special" || card_data.deck === "weather") {
				special += x.count;
				continue;
			}
			units += x.count;
			strength += card_data.strength * x.count;
			if (card_data.ability.split(" ").includes("hero"))
				hero += x.count;
		}
		this.stats = {total: total, units: units, special: special, strength: strength, hero: hero};
		this.updateStats();
	}
	
	// Updates and displays the statistics describing the cards currently in the deck
	updateStats(){
		let stats = document.getElementById("deck-stats");
		stats.children[1].innerHTML = this.stats.total;
		stats.children[3].innerHTML = this.stats.units +(this.stats.units < ForGameStart.unitscards ? "/" + ForGameStart.unitscards : "");
		stats.children[5].innerHTML = this.stats.special + "/" + ForGameStart.special;
		stats.children[7].innerHTML = this.stats.strength;
		stats.children[9].innerHTML = this.stats.hero + "/" + ForGameStart.hero;
		
		stats.children[3].style.color = this.stats.units < ForGameStart.unitscard ? "red" : "";
		stats.children[5].style.color = (this.stats.special > ForGameStart.special) ? "red" : "";
		stats.children[9].style.color = (this.stats.hero > ForGameStart.hero) ? "red" : "";
	}
	
	// Opens a Carousel to allow the client to select a leader for their deck
	selectLeader(){
		let container = new CardContainer();
		container.cards = this.leaders.map(c => {
			let card = new Card(c.card, player_me);
			card.data = c;
			return card;
		});
		
		let index = this.leaders.indexOf(this.leader);
		ui.queueCarousel(container, 1, (c,i) => {
			let data = c.cards[i].data;
			this.leader = data;
			this.leader_elem.children[1].style.backgroundImage = largeURL(data.card.deck + "_" + data.card.filename);
		}, () => true, false, true);
		Carousel.curr.index = index;
		Carousel.curr.update();
	}
	
	// Opens a Carousel to allow the client to select a faction for their deck
	selectFaction() {
		let container = new CardContainer();
		container.cards = Object.keys(factions).map( f => {
			return {abilities: [f], filename: f, desc_name: factions[f].name, desc: factions[f].description, faction: "faction"};
		});
		let index = container.cards.reduce((a,c,i) => c.filename === this.faction ? i : a, 0);
		ui.queueCarousel(container, 1, (c,i) => {
			const card_faction_name = c.cards[i].filename;
			let change = this.setFaction(card_faction_name);
			if (!change)
				return;
			const faction_premade_deck = premade_deck.find(d => d.faction === card_faction_name)

			if (faction_premade_deck) {
				if (!faction_premade_deck?.cards[0].index)
					faction_premade_deck.cards = faction_premade_deck.cards.map(c => ({index: c[0], count: c[1]}) );
				this.makeBank(card_faction_name, faction_premade_deck.cards);
			} else	
				this.makeBank(card_faction_name);
			this.update();
		}, () => true, false, true);
		Carousel.curr.index = index;
		Carousel.curr.update();
	}
	
	// Called when client selects s a preview card. Moves it from bank to deck or vice-versa then updates;
	select(index, isBank){
		if (isBank) {
			tocar("menu_buy", false);
			this.add(index, this.deck);
			this.remove(index, this.bank);
		} else {
			tocar("discard", false);
			this.add(index, this.bank);
			this.remove(index, this.deck);
		}
		this.update();
	}
	
	// Adds a card to container (Bank or deck)
	add(index, cards) {
		let id = cards[index];
		id.elem.children[0].innerHTML = ++id.count;
	}
	
	// Removes a card from container (bank or deck)
	remove(index, cards) {
		let id = cards[index];
		id.elem.children[0].innerHTML = --id.count;
	}
	
	// Removes all elements in the bank and deck
	clear(){
		while (this.bank_elem.firstChild)
			this.bank_elem.removeChild(this.bank_elem.firstChild);
		while (this.deck_elem.firstChild)
			this.deck_elem.removeChild(this.deck_elem.firstChild);
		this.bank = [];
		this.deck = [];
		this.stats = {};
	}
	
	// Verifies current deck, creates the players and their decks, then starts a new game
	async startNewGame(){
		if (!twoPlayersConnected) {
    console.warn("Cannot start game: waiting for second player.");
	showTooltip("Cannot start game: waiting for second player.");
    return;
}
		if (amReady) {
			amReady = false;
			readyButtonElem.classList.remove("ready");
			customizationElem.classList.remove("noclick");
			comp_and_send(socket, JSON.stringify({ type: "unReady" }));
			return
		}
		console.log("[Start] \\this.stats\\", this.stats);
		let warning = "";;
		if (this.stats.units < ForGameStart.unitscards)
			warning += `Your deck must have at least ${ForGameStart.unitscards} unit cards. \n`;
		if (this.stats.special > ForGameStart.special)
			warning += `Your deck must have no more than ${ForGameStart.special} special cards. \n`;
		if (this.stats.hero > ForGameStart.hero)
			warning += `Your deck must have no more than ${ForGameStart.hero} hero cards. \n`;
			
		if (warning != "")
			return alert(warning);
		else {
			readyButtonElem.classList.add("ready");
			customizationElem.classList.add("noclick");
		} 

		let me_deck = { 
			faction: this.faction,
			leader: card_dict[this.leader.index], 
			cards: this.deck.filter(x => x.count > 0)
		};

		player_me = new Player(0, "you", me_deck );
		comp_and_send(socket, JSON.stringify({ type: "ready", deck: me_deck }));
		amReady = true;
		 showTooltip("You are ready, please wait for opponent!");
		if (opponentReady) {
			this.elem.classList.add("hide");
			game.startGame();
		}
	}
	
	// Converts the current deck to a JSON string
	deckToJSON(){
		let obj = {
			faction: this.faction,
			leader: this.leader.index, 
			cards: this.deck.filter(x => x.count > 0).map(x => [x.index, x.count])
		};
		return JSON.stringify(obj);
	}
	
	// Called by the client to download the current deck as a JSON file
	downloadDeck(){
		let json = this.deckToJSON();
		let str = "data:text/json;charset=utf-8," + encodeURIComponent(json);
		let hidden_elem = document.getElementById('download-json');
		hidden_elem.href = str;
		hidden_elem.download = "GwentDeck.json";
		hidden_elem.click();
	}
	
	// Called by the client to upload a JSON file representing a new deck
	uploadDeck() {
		let files = document.getElementById("add-file").files;
		if (files.length <= 0)
			return false;
		let fr = new FileReader();
		fr.onload = e => {
			try {
				this.deckFromJSON(e.target.result);
			} catch (e) {
				alert("Uploaded deck is not formatted correctly!");
			}
		}
		fr.readAsText(files.item(0));
		document.getElementById("add-file").value = "";
	}
	
	// Creates a deck from a JSON file's contents and sets that as the current deck
	// Notifies client with warnings if the deck is invalid
	deckFromJSON(json) {
		let deck;
		try {
			deck = JSON.parse(json);
		} catch (e) {
			alert("Uploaded deck is not parsable!");
			return;
		}
		let warning = "";
		if (card_dict[deck.leader].row !== "leader")
			warning += "'" + card_dict[deck.leader].name + "' is cannot be used as a leader\n";
		if (deck.faction != card_dict[deck.leader].deck)
			warning += "Leader '" + card_dict[deck.leader].name + "' doesn't match deck faction '" + deck.faction + "'.\n";
		
		let cards = deck.cards.filter( c => {
			let card = card_dict[c[0]];
			if (!card) {
				warning += "ID " + c[0] + " does not correspond to a card.\n";
				return false
			}
			if (![deck.faction, "neutral", "special", "weather"].includes(card.deck)) {
				warning += "'" + card.name + "' cannot be used in a deck of faction type '" + deck.faciton +"'\n";
				return false;
			}
			if (card.count < c[1]) {
				warning += "Deck contains " + c[1] + "/" + card.count + " available " + card_dict[c.index].name + " cards\n";
				return false;
			}
			return true;
		})
		.map(c => ({index:c[0], count:Math.min(c[1], card_dict[c[0]].count)}) );
		
		if (warning && !confirm(warning + "\n\n\Continue importing deck?"))
			return;
		this.setFaction(deck.faction, true);
		comp_and_send(socket, JSON.stringify({ type: "opChangeFaction", faction: deck.faction }));
		if (card_dict[deck.leader].row === "leader" && deck.faction === card_dict[deck.leader].deck){
			this.leader = this.leaders.find(c => c.index === deck.leader);
			this.leader_elem.children[1].style.backgroundImage = largeURL(this.leader.card.deck + "_" + this.leader.card.filename);
		}
		this.makeBank(deck.faction, cards);
		this.update();
	}
}

// Translates a card between two containers
async function translateTo(card, container_source, container_dest){
	if (!container_dest || !container_source)
		return;
	if (container_dest === player_op.hand && container_source === player_op.deck)
		return;
	
	let elem = card.elem;
	let source = !container_source ? card.elem : getSourceElem(card, container_source, container_dest);
	let dest = getDestinationElem(card, container_source, container_dest);
	if (!isInDocument(elem))
		source.appendChild(elem);
	let x = trueOffsetLeft(dest) - trueOffsetLeft(elem) +dest.offsetWidth/2 - elem.offsetWidth;
	let y = trueOffsetTop(dest) - trueOffsetTop(elem) +dest.offsetHeight/2 - elem.offsetHeight/2;
	if (container_dest instanceof Row && container_dest.cards.length !== 0 && !card.isSpecial() ){
		x += (container_dest.getSortedIndex(card) === container_dest.cards.length) ? elem.offsetWidth/2 : -elem.offsetWidth/2;
	}
	if (card.holder.controller instanceof ControllerOpponent)
		x += elem.offsetWidth/2;
	if (container_source instanceof Row && container_dest instanceof Grave && !card.isSpecial()) {
		let mid = trueOffset(container_source.elem, true) + container_source.elem.offsetWidth/2;
		x += trueOffset(elem, true) - mid;
	}
	if (container_source instanceof Row && container_dest === player_me.hand)
		y *= 7/8;
	await translate(elem, x, y);
	
	// Returns true if the element is visible in the viewport
	function isInDocument(elem){
		return elem.getBoundingClientRect().width !== 0;
	}
	
	// Returns the true offset of a nested element in the viewport
	function trueOffset(elem, left){
		let total =0
		let curr = elem;
		while (curr){
			total += (left ? curr.offsetLeft : curr.offsetTop);
			curr = curr.parentElement;
		}
		return total;
	}
	function trueOffsetLeft(elem) {	return trueOffset(elem, true); }
	function trueOffsetTop(elem) { return trueOffset(elem, false); }
	
	// Returns the source container's element to transition from
	function getSourceElem(card, source, dest){
		if (source instanceof HandOpponent)
			return source.hidden_elem;
		if (source instanceof Deck)
			return source.elem.children[source.elem.children.length-2];
		return source.elem;
	}

	// Returns the destination container's element to transition to
	function getDestinationElem(card, source, dest){
		if (dest instanceof HandOpponent)
			return dest.hidden_elem;
		if (card.isSpecial() && dest instanceof Row)
			return dest.elem_special;
		if (dest instanceof Row || dest instanceof Hand || dest instanceof Weather){
			if (dest.cards.length === 0)
				return dest.elem;
			let index = dest.getSortedIndex(card);
			let dcard = dest.cards[index === dest.cards.length ? index-1 : index];
			return dcard.elem;
		}
		return dest.elem;
	}
}

// Translates an element by x from the left and y from the top
async function translate(elem, x, y){
	let vw100 = 100 / document.getElementById("dimensions").offsetWidth;
	x*=vw100;
	y*=vw100 ;
	elem.style.transform = "translate(" + x + "vw, " + y + "vw)";
	let margin = elem.style.marginLeft;
	elem.style.marginRight = -elem.offsetWidth*vw100 + "vw";
	elem.style.marginLeft = "";
	await sleep(499);
	elem.style.transform = "";
	elem.style.position = "";
	elem.style.marginLeft = margin;
	elem.style.marginRight = margin;
}

// Fades out an element until hidden over the duration
async function fadeOut(elem, duration, delay) {
	await fade(false, elem, duration, delay);
}

// Fades in an element until opaque over the duration
async function fadeIn(elem, duration, delay){
	await fade(true, elem, duration, delay);
}

// Fades an element over a duration 
async function fade(fadeIn, elem, dur, delay){
	if (delay)
		await sleep(delay)
	let op = fadeIn ?  0.1 : 1;
	elem.style.opacity = op;
	elem.style.filter = "alpha(opacity=" + (op * 100) + ")";
	if (fadeIn)
		elem.classList.remove("hide");
	let timer = setInterval( async function() {
		op += op * (fadeIn ? 0.1 : -0.1);
		if (op >= 1) {
			clearInterval(timer);
			return;
		} else if (op <= 0.1) {
			elem.classList.add("hide");
			elem.style.opacity = "";
			elem.style.filter = "";
			clearInterval(timer);
			return;
		}
		elem.style.opacity = op;
		elem.style.filter = "alpha(opacity=" + (op * 100) + ")";
	}, dur/24);
}

//      Get Image paths   
function iconURL(name, ext = "png"){
	return imgURL("icons/" + name, ext);
}
function largeURL(name, ext="jpg"){
	return imgURL("lg/" + name, ext) 
}
function smallURL(name, ext="jpg"){
	return imgURL("sm/" + name, ext);
}
function imgURL(path, ext) {
	// return "url('img/" + path + "." + ext;
	return "url('img/" + path + "." + ext + "')";
}

// Returns true if n is an Number
function isNumber(n) { 
	return !isNaN(parseFloat(n)) && isFinite(n);
}

// Returns true if s is a String
function isString(s){
	return typeof(s) === 'string' || s instanceof String;
}

// Returns a random integer in the range [0,n)
function randomInt(n)  {
	return Math.floor(Math.random() * n);
}

// Pauses execution until the passed number of milliseconds as expired
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
  //return new Promise(resolve => setTimeout(() => {if (func) func(); return resolve();}, ms));
}

// Suspends execution until the predicate condition is met, checking every ms milliseconds
function sleepUntil(predicate, ms) {
	return new Promise(resolve => {
		let timer = setInterval( function () {
			if (predicate()) {
				clearInterval(timer);
				resolve();
			}
		}, ms)
	});
}


// Remove circular references to create JSON.
function removeCircularReferences(obj) {
	const seen = new WeakSet();
	return JSON.parse(JSON.stringify(obj, (key, value) => {
			if (typeof value === "object" && value !== null) {
					if (seen.has(value)) {
							return;
					}
					seen.add(value);
			}
			return value;
	}));
}


function createCardElement(card){
	let elem = document.createElement("div");
	elem.style.backgroundImage = smallURL(card.faction + "_" + card.filename);
	elem.classList.add("card");
	elem.addEventListener("click", () => ui.selectCard(card), false);
	
	if (card.row === "leader")
		return elem;
	
	let power = document.createElement("div");
	elem.appendChild(power);
	let bg;
	if (card.hero) {
		bg = "power_hero";
		elem.classList.add("hero");
	} else if (card.faction === "weather") {
		bg = "power_" + card.abilities[0];
	} else if (card.faction === "special") {
		bg = "power_" + card.abilities[0];
		elem.classList.add("special");
	} else {
		bg = "power_normal";
	}
	power.style.backgroundImage = iconURL(bg);
	
	let row = document.createElement("div");
	elem.appendChild(row);
	if (card.row === "close" || card.row === "ranged" || card.row === "siege" || card.row === "agile") {
		let num = document.createElement("div");
		num.appendChild( document.createTextNode(card.basePower) );
		num.classList.add("center");
		power.appendChild(num);
		row.style.backgroundImage = iconURL("card_row_" + card.row);
	}

	let abi = document.createElement("div");
	elem.appendChild(abi);
	if (card.faction !== "special" && card.faction !== "weather" && card.abilities.length > 0) {
		let str =  card.abilities[card.abilities.length-1];
		if (str === "cerys")
			str = "muster";
		if (str.startsWith("avenger"))
			str = "avenger";
		if (str === "scorch_c" || str == "scorch_r" || str === "scorch_s")
			str = "scorch";
		abi.style.backgroundImage = iconURL("card_ability_" + str);
	} else if (card.row === "agile")
		abi.style.backgroundImage = iconURL("card_ability_" + "agile");
	
	elem.appendChild( document.createElement("div") ); // animation overlay
	return elem;
}


function somCarta() {
	var classes = ["card", "card-lg"];
	for (var i = 0; i < classes.length; i++) {
		var cartas = document.getElementsByClassName(classes[i]);
		for (var j = 0; j < cartas.length; j++) {
			if (cartas[j].id != "no_sound" && cartas[j].id != "no_hover") cartas[j].addEventListener("mouseover", function() {
				tocar("card", false);
			});
		}
	}
	var tags = ["label", "a", "button"];
	for (var i = 0; i < tags.length; i++) {
		var rec = document.getElementsByTagName(tags[i]);
		for (var j = 0; j < rec.length; j++) rec[j].addEventListener("mouseover", function() {
			tocar("card", false);
		});
	}
	var ids = ["pass-button", "toggle-music"];
	for (var i = 0; i < ids.length; i++) document.getElementById(ids[i]).addEventListener("mouseover", function() {
		tocar("card", false);
	});
}

var lastSound = "";
// legacy
//function tocar(arquivo, pararMusica) {
//	console.log("[sfx] play: arquivo, pararMusica", arquivo, pararMusica)
//	if (arquivo != lastSound && arquivo != "") {
	//	var s = new Audio("sfx/" + arquivo + ".mp3");
     //   if (pararMusica && ui.youtube && ui.youtube.getPlayerState() === YT.PlayerState.PLAYING) {
	//		ui.youtube.pauseVideo();
	//		ui.toggleMusic_elem.classList.add("fade");
	//	}
	//	lastSound = arquivo;
	//	s.play();
	//	setTimeout(function() {
	//		lastSound = "";
	//	}, 50);
	//}
//}

// cache:
async function loadPackedSFX() {
	var loadPackedSFX_pref = "[sfx] [zip]";

	console.log(loadPackedSFX_pref, " loading packed.zip");

    const response = await fetch("sfx/packed.zip");
    const buffer = await response.arrayBuffer();
	console.log(loadPackedSFX_pref, " buffer ", buffer);
    const zip = await JSZip.loadAsync(buffer);

    const files = Object.keys(zip.files);
console.log(loadPackedSFX_pref, " files ", files);
    for (const filename of files) {
        if (!filename.endsWith(".mp3")) continue;

        const blob = await zip.files[filename].async("blob");

        const url = URL.createObjectURL(blob);

        const cleanName = filename
            .replace("sfx/", "")
            .replace(".mp3", "");

        audio_cache[cleanName] = url;

        console.log(loadPackedSFX_pref, " cached:", cleanName);
    }

    console.log(loadPackedSFX_pref, " all sounds loaded");
}
// new:
function tocar(arquivo, pararMusica) {
	//console.log("[sfx] tocar() called");
	//console.log("[sfx] params -> arquivo:", arquivo, "| pararMusica:", pararMusica);
	//console.log("[sfx] current lastSound:", lastSound);

	if (arquivo != lastSound && arquivo != "") {
	//	console.log("[sfx] sound allowed to play");

	
	var audioPath = audio_cache[arquivo] || ("sfx/" + arquivo + ".mp3");

// console.log("[sfx] creating Audio with path:", audioPath);

var s = new Audio(audioPath);

		if (pararMusica) {
		//	console.log("[sfx] pararMusica is true");

			if (ui.youtube) {
			//	console.log("[sfx] youtube player exists");

				var state = ui.youtube.getPlayerState();
			//	console.log("[sfx] youtube player state:", state);

				if (state === YT.PlayerState.PLAYING) {
			//		console.log("[sfx] youtube is playing -> pausing video");

					ui.youtube.pauseVideo();

					if (ui.toggleMusic_elem) {
			//			console.log("[sfx] adding fade class to toggleMusic element");
						ui.toggleMusic_elem.classList.add("fade");
					} else {
			//			console.warn("[sfx] ui.toggleMusic_elem not found");
					}
				} else {
			//		console.log("[sfx] youtube exists but is not playing");
				}
			} else {
			//	console.warn("[sfx] ui.youtube does not exist");
			}
		} else {
		//	console.log("[sfx] pararMusica is false -> not touching music");
		}

		lastSound = arquivo;
		//console.log("[sfx] lastSound updated to:", lastSound);

		s.play()
			.then(() => {
			//	console.log("[sfx] audio playback started successfully");
			})
			.catch((err) => {
			//	console.error("[sfx] audio playback failed:", err);
			});

		setTimeout(function () {
		//	console.log("[sfx] resetting lastSound after timeout");
			lastSound = "";
		}, 50);

	} else {
		if (arquivo == "") {
			//console.warn("[sfx] blocked: arquivo is empty");
		} else {
		//	console.warn("[sfx] blocked: same as lastSound:", arquivo);
		}
	}
}

/*----------------------------------------------------*/

function onYouTubeIframeAPIReady() {
	ui.initYouTube();
}

function iniciarMusica() {
	try {
		if (ui.youtube.getPlayerState() !== YT.PlayerState.PLAYING) {
			ui.youtube.playVideo();
			ui.toggleMusic_elem.classList.remove("fade");
		}
	} catch(err) {}
}


var ui = new UI();

var board = new Board();
var weather = new Weather();
var game = new Game();
var player_me, player_op;

ui.enablePlayer(false);
let dm = new DeckMaker();

function cartaNaLinha(id, carta) {
	if (id.charAt(0) == "f") {
		if (!carta.hero) {
			if (carta.name != "Decoy") {
				var linha = parseInt(id.charAt(1));
				if (linha == 1 || linha == 6) tocar("common3", false);
				else if (linha == 2 || linha == 5) tocar("common2", false);
				else if (linha == 3 || linha == 4) tocar("common1", false);
			} else tocar("menu_buy", false);
		} else tocar("hero", false);
	}
}

function inicio() {
	var classe = document.getElementsByClassName("abs");
	for (var i = 0; i < classe.length; i++) classe[i].style.display = "none";
	iniciou = true;
	tocar("menu_opening", false);
	// openFullscreen();
	iniciarMusica();
}

var iniciou = false, isLoaded = false;
window.onload = function() {

	document.getElementById("load_text").style.display = "none";
	document.getElementById("button_start").style.display = "inline-block";
	customizationElem.style.display = "";
	document.getElementById("toggle-music").style.display = "";
	document.getElementsByTagName("main")[0].style.display = "";
	document.getElementById("button_start").addEventListener("click", function() {
		inicio();
		// cache audio:
		try {
			console.log("[sfx] In init: loadPackedSFX()");
			loadPackedSFX();
		} catch (e) {
			console.log("[sfx] In init: loadPackedSFX(); err", e);
		}
    });
	isLoaded = true;
}

let spacebarPressTimer;
let isSpacebarPressed = false;

function handleKeyDown(event) {
    if (event.code === 'Space' && !isSpacebarPressed) {
        isSpacebarPressed = true;
        spacebarPressTimer = setTimeout(() => {
					document.removeEventListener('keydown', handleKeyDown);
					document.removeEventListener('keyup', handleKeyUp);
					passButton.classList.remove("loading");
          player_me.passRound();
					comp_and_send(socket, JSON.stringify({ type: "pass", player: playerId }));
        }, 2 * 1000); 
        startLoadingEffect();
    }
}

function handleKeyUp(event) {
    if (event.code === 'Space') {
        isSpacebarPressed = false;
        clearTimeout(spacebarPressTimer);
        stopLoadingEffect();
    }
}

function startLoadingEffect() {
	passButton.classList.add('loading');
}

function stopLoadingEffect() {
	passButton.classList.remove('loading');
}

