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