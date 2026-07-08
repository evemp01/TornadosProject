import { IntentionDeliberation } from "../intentions/IntentionDeliberation.js";

/**
 * @abstract
 */
export class PlanBase {

    // This is used to stop the plan
    #stopped = false;
    stop () {
        // this.log( 'stop plan' );
        this.#stopped = true;
        for ( const i of this.#sub_intentions ) {
            i.stop();
        }
    }
    get stopped () {
        return this.#stopped;
    }

    /**
     * #commited means a plan should not be interrupted by a new plan.
     */
    #commited = false;
    commit(){
        this.#commited = true;
    }
    get committed(){
        return this.#commited || this.#sub_intentions.some(i => i.committed);
    }

    /**
     * #parent refers to caller
     */
    #parent;
    /**
     * @param { PlanBase } parent
     */
    constructor ( parent, planLibrary ) {
        this.#parent = parent;
        this.planLibrary = planLibrary;
    }

    /** @type { function(...any): void } */
    log ( ...args ) {
        if ( this.#parent && this.#parent.log )
            this.#parent.log( '\t', ...args )
        else
            console.log( ...args )
    }

    // this is an array of sub intention. Multiple ones could eventually being achieved in parallel.
    /** @type { IntentionDeliberation [] } */
    #sub_intentions = [];

    /**
     * @param { [string, ...any] } predicate 
     * @returns { Promise<boolean> }
     */
    async subIntention ( predicate ) {
        const sub_intention = new IntentionDeliberation( this, predicate, this.planLibrary );
        this.#sub_intentions.push( sub_intention );
        return sub_intention.achieve();
    }

}