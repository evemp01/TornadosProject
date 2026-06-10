import 'dotenv/config';
import { DjsConnect } from "@unitn-asa/deliveroo-js-sdk/client";
import { parcels, initParcels } from "./BDI_agent/beliefs/parcels.js";
import { initMap, deliveryTiles, spawnTiles, whiteTiles } from "./BDI_agent/beliefs/map.js";
import { initAgents, agents } from "./BDI_agent/beliefs/agents.js";
import { IntentionRevisionRevise } from "./BDI_agent/intentions/IntentionRevisionRevise.js";
import { planLibrary } from "./BDI_agent/plans/index.js";
import { createLLMAgent } from "./main_LLM.js";
import { initMe} from "./BDI_agent/beliefs/me.js";
import { optionsGeneration } from "./BDI_agent/agent/optionsGeneration.js";
import { missionAdded } from "./BDI_agent/utils/events.js";
import {createBDI} from "./main_BDI.js";
import { setLLMAgent, setBDIAgent, pushEvent, running } from "./BDI_agent/utils/eventQueue.js";
//import readline from "readline";


//masterName2 = tornado2
//masterID2 = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI4OTUzZCIsIm5hbWUiOiJ0b3JuYWRvMiIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc5Nzg5NTE3fQ.izjRe6OVEEHpPKLNEMmQzaPvoNG1DPdLeN5pu1Zx5j4
//masterName5 = tornado5
//masterID5 = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkZGUwZiIsIm5hbWUiOiJ0b3JuYWRvNSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzgwNDIzMzgwfQ.37l-r3mygPq_zr5kiC5ko75AiZgu6eEGd3RJXwj_cvM

/*
const masterName = process.argv[2];
const DELIVEROOJS_TOKEN = process.argv[3];
setTerminalToken(DELIVEROOJS_TOKEN);

console.log(`Master name: ${masterName}`);
console.log(`DeliverooJS Token: ${DELIVEROOJS_TOKEN}`);
*/

//-----------------------------------------------------------------
//BDI Agent Initialization
//-----------------------------------------------------------------

const { socket, myAgent: bdiAgent } = createBDI(); // Initialize BDI agent and get socket reference
setBDIAgent(bdiAgent); 

//-----------------------------------------------------------------
//LLM Agent Initialization
//-----------------------------------------------------------------

export const llmAgent = createLLMAgent(); 
setLLMAgent(llmAgent);

missionAdded.on("newMission", () => {optionsGeneration(bdiAgent);});

socket.onMsg(async (id, name, msg) => {
    console.log(`Received message from ${name}:`, msg);
    if (name) {
        pushEvent('chatMsg', msg);
    }
});

setInterval(() => {
    console.log("\n=== INTENTION QUEUE ===");

    console.log(
        bdiAgent.intention_queue.map(i => i.predicate)
    );

    console.log(running ? "running" : "idle");
}, 10000);