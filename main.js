import 'dotenv/config';
import { DjsConnect } from "@unitn-asa/deliveroo-js-sdk/client";
import { me, initMe } from "./beliefs/me.js";
import { parcels, initParcels } from "./beliefs/parcels.js";
import { deliveryTiles, initDeliveryTiles } from './beliefs/deliveryTiles.js';
import { spawnTiles, initSpawnTiles } from "./beliefs/spawnTiles.js";
import { IntentionRevisionReplace } from "./intentions/IntentionRevisionReplace.js";
import { planLibrary } from "./plans/index.js";
import { optionsGeneration } from "./agent/optionsGeneration.js";

export const socket = DjsConnect(
    process.env.HOST,
    process.env.TOKEN,
);

// beliefs
initMe(socket);
initParcels(socket);
initDeliveryTiles(socket);
initSpawnTiles(socket);


// agent
const myAgent = new IntentionRevisionReplace(planLibrary);
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

console.log("ME:", me);
console.log("PARCELS:", parcels.size);