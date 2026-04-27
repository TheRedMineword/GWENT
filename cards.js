let card_dict = [];

async function loadCards() {
    const res = await fetch("card.json");

    if (!res.ok) {
        throw new Error("Failed to load card.json");
    }

    card_dict = await res.json();

    console.log("Cards loaded:", card_dict);

    loadGwent();
}

function loadGwent() {
    const script = document.createElement("script");
    script.src = "gwent.js";
    script.type = "text/javascript";

    script.onload = () => {
        console.log("gwent.js loaded AFTER cards");
    };

    document.body.appendChild(script);
}

// start boot
loadCards();