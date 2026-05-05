export const me = { id: '', name: '', x: -1, y: -1, score: 0 };

export function initMe(socket) {
    socket.onYou(({ id, name, x, y, score }) => {
        me.id = id;
        me.name = name;
        me.x = (x !== undefined) ? x : me.x;
        me.y = (y !== undefined) ? y : me.y;
        me.score = score;
    });
}