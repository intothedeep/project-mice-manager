-- Litter ordering index (P0.2, R9).
--
-- UNIQUE(mouse_letter_id) alone does NOT serve this ORDER BY, because
-- length(mouse_letter_id) is an EXPRESSION. Length-first is required, not
-- stylistic: codes are variable-length with a ZZZ->AAAA rollover, and a plain
-- lexicographic sort places 'ZZZ' AFTER 'AAAA'.
--
-- COLLATE "C" is not repeated here — the column itself is declared COLLATE "C"
-- in 0002, so this index and any ORDER BY inherit it.
--
-- Scope note: the mouse-list query sorts mice by litter columns ACROSS A JOIN,
-- so no index removes that sort. Cardinality is low (hundreds of litters,
-- thousands of mice), so an in-memory sort is fine for P0. This index exists for
-- litter-list and next-code queries. Do not over-engineer it.
CREATE INDEX litters_code_order_idx
    ON litters (length(mouse_letter_id), mouse_letter_id)
    WHERE deleted_at IS NULL;
