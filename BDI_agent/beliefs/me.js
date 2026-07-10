export const me = { id: '', name: '', x: -1, y: -1, score: 0 };
export const config = { observationDistance: null }; // updated once config arrives

export function initMe(socket) {
    socket.onYou(({ id, name, x, y, score }) => {
        me.id = id;
        me.name = name;
        me.x = (x !== undefined) ? x : me.x;
        me.y = (y !== undefined) ? y : me.y;
        me.score = score;
    });
    socket.onConfig((cfg) => {
        const d = Number(cfg?.GAME?.player?.observation_distance);
        if (!Number.isFinite(d) || d <= 0) {
            console.warn('[config] observation distance not found at GAME.player.observation_distance');
            return;
        }
        config.observationDistance = d;
        console.log(`[config] observationDistance = ${d}`);
    });
}