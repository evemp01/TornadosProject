/**
 * Intention revision loop
 * This is the main loop of the agent that continuously checks the intention queue and tries to achieve the intentions in it.
 */
import { parcels } from "../beliefs/parcels.js";

export class IntentionRevision {

    /** @type {IntentionDeliberation[]} */
    #intention_queue = new Array();
    #running = null;

    get intention_queue () {
        return this.#intention_queue;
    }
    get running () {
        return this.#running;
    }

    async loop ( ) {
        while ( true ) {
            // Consumes intention_queue if not empty
            if ( this.intention_queue.length > 0 ) {
                //console.log( 'intentionRevision.loop', this.intention_queue.map(i=>i.predicate) );
            
                // Current intention
                const intention = this.intention_queue[0];
                let id = intention.predicate[3]
                let p = parcels.get(id)
                if ( p && p.carriedBy ) {
                    //console.log( 'Skipping intention because no more valid', intention.predicate );
                    this.intention_queue.shift(); // Ta bort den ogiltiga intentionen
                    continue; 
                }

                // Start achieving intention
                this.#running = intention;
                await intention.achieve()
                // Catch eventual error and continue
                .catch( error => {
                    // console.log( 'Failed intention', ...intention.predicate, 'with error:', ...error )
                } );
                this.#running = null;
                // Remove from the queue

                const index = this.intention_queue.indexOf(intention);
                if ( index !== -1 ) {
                    this.intention_queue.splice(index, 1);
                }
            }
            // Postpone next iteration at setImmediate
            await new Promise( res => setImmediate( res ) );
        }
    }

    // async push ( predicate ) { }

    /** @type { function(...any): void } */
    log ( ...args ) {
        //console.log( ...args )
    }

    /**
     * @abstract
     * @param { [string, ...any] } predicate is in the form ['go_to', x, y]
     */
    async push ( predicate ) {
    }

}