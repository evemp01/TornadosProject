export const grid = new Map();
export const deliveryTiles = [];
export const spawnTiles = [];
export const blackTiles = [];
export let mapWidth = 0;
export let mapHeight = 0;

export function initMap(socket) {
    socket.onMap((width, height, tiles) => {
        mapWidth = width;
        mapHeight = height;

        for (const tile of tiles) {
            grid.set(`${tile.x},${tile.y}`, tile.type);

            if (tile.type === 0) blackTiles.push(tile);
            if (tile.type === 1) spawnTiles.push(tile);
            if (tile.type === 2) deliveryTiles.push(tile);
        }

        console.log(`Map loaded: ${width}x${height}, ${tiles.length} tiles, ${deliveryTiles.length} delivery tiles`);
    });
}

export function isWalkable(x, y) {
    const type = grid.get(`${x},${y}`);
    return type === 1 || type === 2 || type === 3;
}

// export function initDeliveryTiles(socket) {
//     socket.onMap((width, height, tiles) => {
//         console.log("TILES:", tiles);
//         for (const tile of tiles) {
//             if (tile.type === 2) {
//                 deliveryTiles.push(tile);
//             }
//         }
//     });
// }

export function isDelivery(x, y) {
    return grid.get(`${x},${y}`) === 2;
}

export function isSpawn(x, y) {
    return grid.get(`${x},${y}`) === 1;
}