/**
 * Intention revision Revise
 */
import { IntentionRevision } from "./IntentionRevision.js";
export class IntentionRevisionRevise extends IntentionRevision {

    /**
     * @param { [string, ...any] } predicate is in the form ['go_to', x, y]
     */
    async push ( predicate ) {
        console.log( 'Revising intention queue. Received', ...predicate );
        // TODO
        // - order intentions based on utility function (reward - cost) (for example, parcel score minus distance)
        // - eventually stop current one
        // - evaluate validity of intention
    }

}
