import { optionsGeneration } from '../agent/optionsGeneration.js';

const chatQueue = [];
let latestSensing = false;
let sensingScheduled = false;
export let running = false;
let bdiAgent = null
let llmAgent = null;

export function pushEvent(type, data = null) {
    if (type === 'chatMsg') {
        chatQueue.push(data);
        processChatQueue();
    }
    if (type === 'sensing') {
        latestSensing = true;
        scheduleSensing();
    }
}

async function processChatQueue() {
    if (running) return;
    running = true;
    try {
        while (chatQueue.length > 0) {
            const { id, msg } = chatQueue.shift();
            await llmAgent.run(msg, id);
            optionsGeneration(bdiAgent);
        }
    } finally {
        running = false;
    }
}

function scheduleSensing() {
    if (sensingScheduled) return;
    sensingScheduled = true;
    setImmediate(() => {
        sensingScheduled = false;
        if (latestSensing) {
            latestSensing = false;
            optionsGeneration(bdiAgent);
        }
    });
}

export function setBDIAgent(agent) {
    bdiAgent = agent;
}

export function setLLMAgent(agent) {
    llmAgent = agent;
}