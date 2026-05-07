export const grid = new Map();
export const deliveryTiles = [];
export const spawnTiles = [];
export const blackTiles = [];
export const whiteTiles = [];
export let mapWidth = 0;
export let mapHeight = 0;

export function initMap(socket) {
    console.log('initMap called, registering onMap listener');
    socket.onMap((width, height, tiles) => {
        mapWidth = width;
        mapHeight = height;
        console.log('onMap fired! tiles:', tiles.length);

        for (const tile of tiles) {
            grid.set(`${tile.x},${tile.y}`, tile.type);
            console.log(tile.type);
            if (tile.type == 0) blackTiles.push(tile);
            if (tile.type == 1) spawnTiles.push(tile);
            if (tile.type == 2) deliveryTiles.push(tile);
            if (tile.type == 3) whiteTiles.push(tile);
        }
        console.log('Map initialized. Delivery tiles:', deliveryTiles.length, 'Spawn tiles:', spawnTiles.length, 'White tiles:', whiteTiles.length);
    });
}

export function isWalkable(x, y) {
    const type = grid.get(`${x},${y}`);
    return type === 1 || type === 2 || type === 3;
}

export function isDelivery(x, y) {
    return grid.get(`${x},${y}`) === 2;
}

export function isSpawn(x, y) {
    return grid.get(`${x},${y}`) === 1;
}