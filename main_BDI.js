import 'dotenv/config';
import { DjsConnect } from "@unitn-asa/deliveroo-js-sdk/client";
import { me, initMe } from "./BDI_agent/beliefs/me.js";
import { parcels, initParcels } from "./BDI_agent/beliefs/parcels.js";
import { initMap, deliveryTiles, spawnTiles, whiteTiles } from "./BDI_agent/beliefs/map.js";
import { initAgents, agents } from "./BDI_agent/beliefs/agents.js";
import { IntentionRevisionRevise } from "./BDI_agent/intentions/IntentionRevisionRevise.js";
import { planLibrary } from "./BDI_agent/plans/index.js";
import { optionsGeneration } from "./BDI_agent/agent/optionsGeneration.js";

export const socket = DjsConnect(
    process.env.HOST,
    process.env.TOKEN,
);

// beliefs
initMe(socket);
initParcels(socket);
initMap(socket);
initAgents(socket);


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
    console.log("AGENTS:", agents.size);
    console.log(
        "LIST:",
        Array.from(parcels.values()).map(p => `${p.id}@(${p.x},${p.y})`)
    );
}, 1000);