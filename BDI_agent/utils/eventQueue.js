import { optionsGeneration } from '../agent/optionsGeneration.js';
import { getSocket } from './socketManager.js';

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

            const { id, msg } = chatQueue.shift();
            const response = await llmAgent.run(msg, id);

            if (response) {
                const socket = getSocket();
                if (!socket) {
                    throw new Error("Socket not initialized");
                }    
                await socket.emitSay(response);// nope no socket in eventQueue???????????????????????????????
            }
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