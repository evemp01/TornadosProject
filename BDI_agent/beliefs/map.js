export const grid = new Map();
export const deliveryTiles = [];
export const spawnTiles = [];
export const blackTiles = [];
export const whiteTiles = [];
export const directionalTiles = new Map(); // key: `${x},${y}` → direction
export const crateTiles = new Map();
export const initialCratePositions = [];
export let mapWidth = 0;
export let mapHeight = 0;

export function initMap(socket) {
    //console.log('initMap called, registering onMap listener');
    socket.onMap((width, height, tiles) => {
        mapWidth = width;
        mapHeight = height;
        //console.log('onMap fired! tiles:', tiles.length);

        for (const tile of tiles) {
            if (tile.type == 0) {grid.set(`${tile.x},${tile.y}`, 0); blackTiles.push(tile);}
            else if (tile.type == 1) {grid.set(`${tile.x},${tile.y}`, 1); spawnTiles.push(tile);}
            else if (tile.type == 2) {grid.set(`${tile.x},${tile.y}`, 2); deliveryTiles.push(tile);}
            else if (tile.type == 3) {grid.set(`${tile.x},${tile.y}`, 3); whiteTiles.push(tile);}
            else if (tile.type === '→' || tile.type === '←' || tile.type === '↑' || tile.type === '↓') {
                grid.set(`${tile.x},${tile.y}`, 'directional');
                directionalTiles.set(`${tile.x},${tile.y}`, tile.type);
            } 
            else if (tile.type == 5 || tile.type == '5!') {
                grid.set(`${tile.x},${tile.y}`, 5);
                crateTiles.set(`${tile.x},${tile.y}`, { x: tile.x, y: tile.y });
                if (tile.type == '5!') initialCratePositions.push({ x: tile.x, y: tile.y });
            }
        }
    });
}

export function isWalkable(x, y) {
    const type = grid.get(`${x},${y}`);
    return type == 1 || type == 2 || type == 3 || type === 'directional' || type == 5; 
}

export function isDelivery(x, y) {
    return grid.get(`${x},${y}`) == 2;
}

export function isSpawn(x, y) {
    return grid.get(`${x},${y}`) == 1;
}

export function getDirection(x, y) {
    return directionalTiles.get(`${x},${y}`) || null;
}