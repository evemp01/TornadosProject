export const spawnTiles = [];

export function initSpawnTiles(socket) {
    socket.onMap((width, height, tiles) => {
        for (const tile of tiles) {
            if (tile.type === 1) {
                spawnTiles.push(tile);
            }
        }
    });
}