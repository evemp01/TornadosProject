import { PlanBase } from "./PlanBase.js";
import { me } from "../beliefs/me.js";
import { socket } from "../main.js";

/**
 * @implements { Plan }
 * @extends { PlanBase }
 */
export class BlindMove extends PlanBase {

    /**
     * @type { function( string, ...any ) : boolean } 
     */
    static isApplicableTo ( go_to, x, y ) {
        return go_to == 'go_to';
    }

    /**
     * @type { function( string, ...any ) : Promise<boolean> } 
     */
    async execute ( go_to, x, y ) {

        while ( me.x != x || me.y != y ) {

            if ( this.stopped ) throw ['stopped']; // if stopped then quit

            let moved_horizontally;
            let moved_vertically;
            
            // this.log('me', me, 'xy', x, y);

            if ( me.x && x > me.x )
                moved_horizontally = await socket.emitMove('right')
                // status_x = await this.subIntention( 'go_to', {x: me.x+1, y: me.y} );
            else if ( me.x && x < me.x )
                moved_horizontally = await socket.emitMove('left')
                // status_x = await this.subIntention( 'go_to', {x: me.x-1, y: me.y} );

            if (moved_horizontally) {
                me.x = moved_horizontally.x;
                me.y = moved_horizontally.y;
            }

            if ( this.stopped ) throw ['stopped']; // if stopped then quit

            if ( me.y && y > me.y )
                moved_vertically = await socket.emitMove('up')
                // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y+1} );
            else if ( me.y && y < me.y )
                moved_vertically = await socket.emitMove('down')
                // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y-1} );

            if (moved_vertically) {
                me.x = moved_vertically.x;
                me.y = moved_vertically.y;
            }
            
            if ( ! moved_horizontally && ! moved_vertically) {
                this.log('stucked');
                throw 'stucked';
            } else if ( me.x == x && me.y == y ) {
                // this.log('target reached');
            }
            
        }

        return true;

    }
}
