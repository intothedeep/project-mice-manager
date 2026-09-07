-- Move mouse-line ownership from mouse_meta to the mice version row (R25).
--
-- WHY: mouse line is MUTABLE (pups are reassigned to other programmes), so it
-- belongs on `mice` version rows, not on `mouse_meta` which is birth-given and
-- never changes. Keeping it on mouse_meta forced a rewrite of the identity row
-- on every reassignment, which contradicts the "mouse_meta = immutable birth
-- facts" contract.
--
-- Every version row in `mice` must carry line_id forward, just as it must carry
-- cage_id, sex, is_alive, etc. The write service's "read head + copy all
-- columns" invariant (documented in 0002) covers this automatically.
--
-- Correction of stale 0002 comment: the note at 0002:612-622 said
-- litters.line_id stored "the programme the LITTER was bred under", but that
-- column never existed — 0002:539 also references mates.line_id, which equally
-- never existed. The bred-under programme is derived by following
-- litter -> mates -> origin mates -> mice version rows of mother/father, which
-- is intentional (single source of truth). This migration is where line_id
-- becomes the actual home for per-mouse programme data.

ALTER TABLE mice
    ADD COLUMN line_id BIGINT REFERENCES mouse_lines (id);

ALTER TABLE mouse_meta
    DROP COLUMN line_id;
