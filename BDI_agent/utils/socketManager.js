// socketManager.js
let socket = null;

export function setSocket(s) {
    socket = s;
}

export function getSocket() {
    return socket;
}

export function sendMessageToSocket(toId, msg) {
    if (!toId) return;
    if (!msg) return;
    if (!socket) return;
    socket.emitSay(toId, msg);
    console.log(`Sent message to socket (to ${toId}):`, msg);
}

export async function moveWithRetry(targetSocket, direction, retries = 2) {
    for (let attempt = 0; ; attempt++) {
        try {
            return await targetSocket.emitMove(direction);
        } catch (error) {
            if (attempt >= retries) throw error;
        }
    }
}

export async function putdownWithRetry(targetSocket, selected = [], retries = 2) {
    for (let attempt = 0; ; attempt++) {
        try {
            const result = await targetSocket.emitPutdown(selected);
            console.log(`[putdownWithRetry] emitPutdown resolved on attempt ${attempt + 1}:`, result);
            return result;
        } catch (error) {
            console.log(`[putdownWithRetry] emitPutdown attempt ${attempt + 1} failed:`, error?.message || error);
            if (attempt >= retries) {
                console.log(`[putdownWithRetry] giving up after ${attempt + 1} attempts`);
                throw error;
            }
        }
    }
}