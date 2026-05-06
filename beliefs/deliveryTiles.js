// beliefs/deliveryTiles.js
export const deliveryTiles = [];

export function initDeliveryTiles(socket) {
    socket.onMap((width, height, tiles) => {
        console.log("TILES:", tiles);
        for (const tile of tiles) {
            if (tile.type === 3) {
                deliveryTiles.push(tile);
            }
        }
    });
}