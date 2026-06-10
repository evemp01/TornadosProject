// socketManager.js
let socket = null;

export function setSocket(s) {
    socket = s;
}

export function getSocket() {
    return socket;
}

export function sendMessageToSocket(msg) {
    if (!msg) return;
    if (!socket) return;
    socket.emitSay(msg);
    console.log("Sent message to socket:", msg);
}