"use strict"

function serializeCards(cards) {
    return cards.map(card => ({
        filename: card.filename
    }));
}

// usage seralize
//const handData = serializeCards(player_me.hand.cards);
//
//comp_and_send(
 //   socket,
 //   JSON.stringify({
 //       type: "initial_reDraw",
//        isMeHand: handData
 //   })
//);




function deserializeCards(rawCards, player) {
    return rawCards.map(raw => {
        const source = card_dict.find(
            c => c.filename === raw.filename
        );

        if (!source) {
            throw new Error(
                `Unknown card ${raw.filename}`
            );
        }

        return new Card(source, player);
    });
}

// usage
//
//player_op.hand.cards = deserializeCards(
 //   data.hand,
//    player_op
//);


async function resync_hands() {
    console.log("[RESYNC]", player_me.hand.cards, "myhand");
    var handData_tosend = serializeCards(player_me.hand.cards);
    var pl = {
        type: "resync_hands()",
        data: handData_tosend,
        player: playerId
    }
    console.log("[RESYNC]", " Cards to send", handData_tosend, "payload:", pl);

    comp_and_send(
    socket,
    JSON.stringify(pl)
);
}

async function init_sync_hands(){
    console.log("[RESYNC]", "On hold for:", resync_wait / 1000, "seconds");
    await sleep(resync_wait);
	await resync_hands();
    return true;
}