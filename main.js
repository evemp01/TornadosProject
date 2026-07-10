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
import { setSocket } from "./BDI_agent/utils/socketManager.js";


//-----------------------------------------------------------------
// Role selection: `node main.js M` runs as master (tornado10), taking
// commands only from the admin. `node main.js S` runs as slave (tornado11),
// taking commands only from the master.
//-----------------------------------------------------------------

const MASTER_ID = '894484'; // tornado10, Tornados(8ed935)

const roleArg = (process.argv[2] || '').toUpperCase();
if (roleArg !== 'M' && roleArg !== 'S') {
    console.error("Usage: node main.js <M|S>   (M = master/tornado10, S = slave/tornado11)");
    process.exit(1);
}

const isMaster = roleArg === 'M';
const token = isMaster ? process.env.DELIVEROOJS_TOKEN : process.env.DELIVEROOJS_TOKEN2;

if (!token) {
    console.error(`Missing ${isMaster ? 'DELIVEROOJS_TOKEN' : 'DELIVEROOJS_TOKEN2'} in .env`);
    process.exit(1);
}

console.log(`Starting as ${isMaster ? 'MASTER (tornado10)' : 'SLAVE (tornado11)'}`);

//-----------------------------------------------------------------
//BDI Agent Initialization
//-----------------------------------------------------------------

const { socket, myAgent: bdiAgent } = createBDI(token); // Initialize BDI agent and get socket reference
setBDIAgent(bdiAgent);
setSocket(socket);


//-----------------------------------------------------------------
//LLM Agent Initialization
//-----------------------------------------------------------------

export const llmAgent = createLLMAgent(); 
setLLMAgent(llmAgent);

missionAdded.on("newMission", () => {optionsGeneration(bdiAgent);});


//name: 'admin' id: 00a552
socket.onMsg(async (id, name, msg) => {
    console.log(`Received message from ${name}:`, msg);

    if (isMaster) {
        // Master only takes commands from the admin.
        if (name !== 'admin') return;
    } else {
        // Slave only takes commands from the master agent.
        if (id !== MASTER_ID) return;
    }

    pushEvent('chatMsg', { id, name, msg });
});

setInterval(() => {
    console.log("\n=== INTENTION QUEUE ===");

    console.log(
        bdiAgent.intention_queue.map(i => i.predicate)
    );

    console.log(running ? "running" : "idle");
}, 10000);