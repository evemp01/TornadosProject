/**
 * Intention revision Queue
 */

/**
 * @extends { IntentionRevision }
 */
import { IntentionRevision } from "./IntentionRevision.js";
export class IntentionRevisionQueue extends IntentionRevision {

    /**
     * @param { [string, ...any] } predicate is in the form ['go_to', x, y]
     */
    async push ( predicate ) {
        
        // Check if already queued
        if ( this.intention_queue.find( (i) => i.predicate.join(' ') == predicate.join(' ') ) )
            return; // intention is already queued

        console.log( 'IntentionRevisionReplace.push', predicate );
        const intention = new IntentionDeliberation( this, predicate );
        this.intention_queue.push( intention );
    }

}