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
import { llmState } from "./BDI_agent/utils/mutex.js";

//-----------------------------------------------------------------
//BDI Agent Initialization
//-----------------------------------------------------------------

const { socket, myAgent: bdiAgent } = createBDI(); // Initialize BDI agent and get socket reference

//-----------------------------------------------------------------
//LLM Agent Initialization
//-----------------------------------------------------------------

const llmAgent = createLLMAgent(); 

missionAdded.on("newMission", () => {optionsGeneration(bdiAgent);});

socket.onMsg(async (id, name, msg) => {
    if (llmState.busy) return; 

    llmState.busy = true;
    try {
        await llmAgent.run(msg);
    } finally {
        llmState.busy = false;
    }
});
