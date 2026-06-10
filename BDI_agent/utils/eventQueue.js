import { optionsGeneration } from '../agent/optionsGeneration.js';

const chatQueue = [];
let latestSensing = false;
export let running = false;
let bdiAgent = null
let llmAgent = null;

export function pushEvent(type, data = null) {
    if (type === 'chatMsg') {chatQueue.push(data);}
    if (type === 'sensing') {latestSensing = true;}
    processQueue();
}

async function processQueue() {
    if (running) return;
    running = true;
    try {
        // 1. chat ALWAYS first
        while (chatQueue.length > 0) {
            const msg = chatQueue.shift();
            await llmAgent.run(msg);
            optionsGeneration(bdiAgent);
        }

        // 2. sensing once (coalesced)
        if (latestSensing) {
            latestSensing = false;
            optionsGeneration(bdiAgent);
        }

    } finally {
        running = false;
    }
}

export function setBDIAgent(agent) {
    bdiAgent = agent;
}

export function setLLMAgent(agent) {
    llmAgent = agent;
}