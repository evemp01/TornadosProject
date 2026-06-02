(define (domain deliveroo)
    (:requirements :strips)
    
    (:predicates
        (agent-at ?pos)          ; Current position of the agent
        (crate-at ?crate ?pos)   ; Current position of a crate
        (is-crate-tile ?pos)     ; Allowed tile for crates
        (connected ?from ?to)    ; Map grid connectivity
        (empty ?pos)             ; True if tile has NO agent and NO crate
    )

    ; 1. Regular Move: Walking into a completely empty tile
    (:action move
        :parameters (?from ?to)
        :precondition (and 
            (agent-at ?from)
            (connected ?from ?to)
            (empty ?to)
        )
        :effect (and
            (agent-at ?to)
            (not (agent-at ?from))
            (empty ?from)        ; Old tile becomes empty
            (not (empty ?to))    ; New tile is no longer empty
        )
    )

    ; 2. Push Move: Walking into a crate (the agent just "walks" towards it)
    ; This action requires 3 lined-up tiles: ?from (agent) -> ?crate-pos (crate) -> ?behind-pos (empty space)
    (:action push_move
        :parameters (?from ?crate-pos ?behind-pos ?crate)
        :precondition (and 
            (agent-at ?from)
            (connected ?from ?crate-pos)    ; Agent walks towards the crate
            (crate-at ?crate ?crate-pos)    ; The crate is there
            (connected ?crate-pos ?behind-pos) ; There is a tile directly behind it
            (is-crate-tile ?behind-pos)     ; The tile behind MUST be a crateTile
            (empty ?behind-pos)             ; The tile behind must be empty
        )
        :effect (and
            ; The agent steps into the crate's old position
            (agent-at ?crate-pos)
            (not (agent-at ?from))
            (empty ?from)                   ; The tile the agent left is now empty
            
            ; The crate gets pushed to the tile behind
            (crate-at ?crate ?behind-pos)
            (not (crate-at ?crate ?crate-pos))
            (not (empty ?behind-pos))       ; The tile behind is no longer empty
            
            ; Note: ?crate-pos doesn't become empty because the agent occupies it immediately!
        )
    )
)