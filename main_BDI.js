import 'dotenv/config';
import { DjsConnect } from "@unitn-asa/deliveroo-js-sdk/client";
import { me, initMe } from "./BDI_agent/beliefs/me.js";
import { parcels, initParcels } from "./BDI_agent/beliefs/parcels.js";
import { initMap, deliveryTiles, spawnTiles, whiteTiles, crateTiles } from "./BDI_agent/beliefs/map.js";
import { initAgents, agents } from "./BDI_agent/beliefs/agents.js";
import { initCrates, crates } from "./BDI_agent/beliefs/crates.js";
import { IntentionRevisionRevise } from "./BDI_agent/intentions/IntentionRevisionRevise.js";
import { planLibrary } from "./BDI_agent/plans/index.js";
import { optionsGeneration } from "./BDI_agent/agent/optionsGeneration.js";
import { pushEvent, setBDIAgent } from "./BDI_agent/utils/eventQueue.js";

//obs goPickUp.js uses socket

export const socket = DjsConnect(process.env.DELIVEROOJS_URL, process.env.DELIVEROOJS_TOKEN);

export function createBDI() {
    initMe(socket);
    initParcels(socket);
    initMap(socket);
    initAgents(socket);
    initCrates(socket);

    const myAgent = new IntentionRevisionRevise(planLibrary);
    setBDIAgent(myAgent);
    myAgent.loop();

    socket.onSensing(() => {
        pushEvent('sensing');
    });

    socket.onYou(() => {
        pushEvent('sensing');
    });

    return { socket, myAgent };
}

//createBDI();
