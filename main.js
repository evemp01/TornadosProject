import 'dotenv/config';
import { DjsConnect } from "@unitn-asa/deliveroo-js-sdk/client";
import { me, initMe } from "./beliefs/me.js";
import { parcels, initParcels } from "./beliefs/parcels.js";
import { initMap, deliveryTiles, spawnTiles, whiteTiles } from './beliefs/map.js';
import { IntentionRevisionRevise } from "./intentions/IntentionRevisionRevise.js";
import { planLibrary } from "./plans/index.js";
import { optionsGeneration } from "./agent/optionsGeneration.js";

export const socket = DjsConnect(
    process.env.HOST,
    process.env.TOKEN,
);

// beliefs
initMe(socket);
initParcels(socket);
initMap(socket);

// agent
const myAgent = new IntentionRevisionRevise(planLibrary);
myAgent.loop();

// options
socket.onSensing(() => optionsGeneration(myAgent));
socket.onYou(() => optionsGeneration(myAgent));

setInterval(() => {
    console.log("\n AGENT STATE");
    console.log("ME:", me);
    console.log("PARCELS:", parcels.size);
    console.log(
        "LIST:",
        Array.from(parcels.values()).map(p => `${p.id}@(${p.x},${p.y})`)
    );
}, 1000);