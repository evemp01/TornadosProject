/**
 * IntentionDeliberation
 * This class is responsible for achieving a desire (predicate) by finding a plan in the plan library that can achieve it.
 * It is used by IntentionRevision to achieve the intentions in the queue.
 * It is also used by plans to achieve sub-intentions.
 */

export class IntentionDeliberation {

    // Plan currently used for achieving the desire 
    /** @type { Plan | undefined } */
    #current_plan;
    
    // This is used to stop the intentionDeliberation
    #stopped = false;
    get stopped () {
        return this.#stopped;
    }
    stop () {
        // this.log( 'stop intentionDeliberation', ...this.#predicate );
        this.#stopped = true;
        if ( this.#current_plan)
            this.#current_plan.stop();
    }

    /**
     * #parent refers to caller
     */
    #parent;

    /**
     * Desire to be achieved, for example ['go_to', x, y]
     * @type { [string, ...any] } predicate is in the form ['go_to', x, y]
     */
    #predicate;
    get predicate () {
        return this.#predicate;
    }

    #planLibrary;

    /**
     * @param { IntentionDeliberation } parent 
     * @param { [string, ...any] } predicate 
     */
    constructor ( parent, predicate, planLibrary ) {
        this.#parent = parent;
        this.#predicate = predicate;
        this.#planLibrary = planLibrary;
    }

    /** @type { function(...any): void } */
    log ( ...args ) {
        if ( this.#parent && this.#parent.log )
            this.#parent.log( '\t', ...args )
        else
            console.log( ...args )
    }

    #started = false;
    /**
     * Using the plan library to achieve an intention
     * @returns { Promise<boolean> } the result of the plan execution
     */
    async achieve () {
        // Cannot start twice
        if ( this.#started)
            return false;
        else
            this.#started = true;

        // Trying all plans in the library
        for (const planClass of this.#planLibrary) {

            // if stopped then quit
            if ( this.stopped ) throw [ 'stopped intention', ...this.predicate ];

            // if plan is 'statically' applicable
            if ( planClass.isApplicableTo( ...this.predicate ) ) {
                // plan is instantiated
                this.#current_plan = new planClass(this.#parent, this.#planLibrary);
                this.log('achieving intention', ...this.predicate, 'with plan', planClass.name);
                // and plan is executed and result returned
                try {
                    const plan_res = await this.#current_plan?.execute( ...this.predicate );
                    this.log( 'succesful intention', ...this.predicate, 'with plan', planClass.name, 'with result:', plan_res );
                    return plan_res || false;
                // or errors are caught so to continue with next plan
                } catch (error) {
                    this.log( 'failed intention', ...this.predicate,'with plan', planClass.name, 'with error:', error );
                }
            }

        }

        // if stopped then quit
        if ( this.stopped ) throw [ 'stopped intention', ...this.predicate ];

        // no plans have been found to satisfy the intention
        // this.log( 'no plan satisfied the intention ', ...this.predicate );
        throw ['no plan satisfied the intention ', ...this.predicate ]
    }

}