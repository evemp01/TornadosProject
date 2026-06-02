import { onlineSolver } from '@unitn-asa/pddl-client';
import { readFileSync } from 'fs';

const domain = readFileSync('./BDI_agent/pddl/domain.pddl', 'utf8');

// Example Grid Layout (3x3):
// [ c11 ] [ c12 (Wall) ] [ c13 ]
// [ c21 ] [ c22 (Crate)] [ c23 ]
// [ c31 ] [ c32 (Goal) ] [ c33 ]

const problem = `
(define (problem grid-crate-problem)
    (:domain deliveroo)
    
    (:objects
        c11 c13
        c21 c22 c23
        c31 c32 c33          ; Notice c12 is completely excluded because it's a wall
        crate1               ; Our crate object
    )
    
    (:init 
        ; Initial positions
        (agent-at c21)
        (crate-at crate1 c22)

        ; Define Walkable Connections (Must be bidirectional for a 2D grid)
        ; Row 1
        ; c12 is a wall, so c11 and c13 have no connections in Row 1

        ; Row 2
        (connected c21 c22) (connected c22 c21)
        (connected c22 c23) (connected c23 c22)

        ; Row 3
        (connected c31 c32) (connected c32 c31)
        (connected c32 c33) (connected c33 c32)

        ; Vertical Connections between Rows
        (connected c11 c21) (connected c21 c11)
        (connected c21 c31) (connected c31 c21)
        
        (connected c22 c32) (connected c32 c22) ; (c12 is a wall, no connection to c22)
        
        (connected c13 c23) (connected c23 c13)
        (connected c23 c33) (connected c33 c23)

        ; Define which tiles are designated as Crate Tiles
        (is-crate-tile c22)
        (is-crate-tile c23)
        (is-crate-tile c32)

        ; Initial Empty Status
        ; Every walkable tile is empty EXCEPT where the agent (c21) and crate (c22) are.
        (empty c11)
        (empty c13)
        (empty c23)
        (empty c31)
        (empty c32)
        (empty c33)
    )

    ; Goal: Push the crate from c22 down to c32
    ; (Agent is at c21, crate is at c22. Moving right pushes it to c23. 
    ; To get it to c32, the agent will have to walk around via c31!)
    (:goal (crate-at crate1 c32))
)`;

console.log('Generating plan for grid layout...');
const plan = await onlineSolver(domain, problem);
console.log('Plan:', plan);