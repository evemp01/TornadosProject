/**
 * Intention revision Replace
 */
import { IntentionRevision } from "./IntentionRevision.js";
import { IntentionDeliberation } from "./IntentionDeliberation.js";
export class IntentionRevisionReplace extends IntentionRevision {

    /**
     * @param { Plan[] } planLibrary 
     */
    constructor(planLibrary) {
        super();
        this.planLibrary = planLibrary;
    }

    /**
     * @param { [string, ...any] } predicate is in the form ['go_to', x, y]
     */
    async push ( predicate ) {

        // Check if already queued
        const last = this.intention_queue.at( this.intention_queue.length - 1 );
        if ( last && last.predicate.join(' ') == predicate.join(' ') ) {
            return; // intention is already being achieved
        }
        
        console.log( 'IntentionRevisionReplace.push', predicate );
        const intention = new IntentionDeliberation( this, predicate, this.planLibrary );
        this.intention_queue.push( intention );
        
        // Force current intention stop 
        if ( last ) {
            last.stop();
        }
    }

}