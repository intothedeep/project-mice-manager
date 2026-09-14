-- Add 'mice' subject kind for batch cases (1 case : N mice), and create
-- the case_mice join table.
--
-- CHANGES IN THIS FILE:
--   1. Extend cases_subject_kind_check: add 'mice' to the 6-value set → 7.
--   2. Extend cases_subject_matches_kind: add 'mice' arm (all FK cols NULL).
--   3. Create case_mice join table with soft-delete + partial unique index.
--
-- 'mice' SEMANTICS: a batch case covers N mice at once and advances as ONE
-- unit (no per-mouse progress). No individual subject FK is set; membership
-- lives exclusively in case_mice. subject_mouse_id / subject_cage_id /
-- subject_slot_id / litter_id / subject_mate_id / subject_line_id are ALL NULL.

-- ---------------------------------------------------------------------------
-- 1. Extend subject_kind CHECK (7 values)
-- ---------------------------------------------------------------------------
ALTER TABLE cases DROP CONSTRAINT cases_subject_kind_check;

ALTER TABLE cases
    ADD CONSTRAINT cases_subject_kind_check
        CHECK (subject_kind IN ('mouse', 'cage', 'slot', 'litter', 'mate', 'line', 'mice'));

-- ---------------------------------------------------------------------------
-- 2. Extend cases_subject_matches_kind (7 branches)
-- ---------------------------------------------------------------------------
ALTER TABLE cases DROP CONSTRAINT cases_subject_matches_kind;

ALTER TABLE cases
    ADD CONSTRAINT cases_subject_matches_kind CHECK (
        CASE subject_kind
            WHEN 'mouse'  THEN subject_mouse_id IS NOT NULL
                               AND subject_cage_id  IS NULL
                               AND subject_slot_id  IS NULL
                               AND litter_id        IS NULL
                               AND subject_mate_id  IS NULL
                               AND subject_line_id  IS NULL
            WHEN 'cage'   THEN subject_cage_id  IS NOT NULL
                               AND subject_mouse_id IS NULL
                               AND subject_slot_id  IS NULL
                               AND litter_id        IS NULL
                               AND subject_mate_id  IS NULL
                               AND subject_line_id  IS NULL
            WHEN 'slot'   THEN subject_slot_id  IS NOT NULL
                               AND subject_mouse_id IS NULL
                               AND subject_cage_id  IS NULL
                               AND litter_id        IS NULL
                               AND subject_mate_id  IS NULL
                               AND subject_line_id  IS NULL
            WHEN 'litter' THEN litter_id        IS NOT NULL
                               AND subject_mouse_id IS NULL
                               AND subject_cage_id  IS NULL
                               AND subject_slot_id  IS NULL
                               AND subject_mate_id  IS NULL
                               AND subject_line_id  IS NULL
            WHEN 'mate'   THEN subject_mate_id  IS NOT NULL
                               AND subject_mouse_id IS NULL
                               AND subject_cage_id  IS NULL
                               AND subject_slot_id  IS NULL
                               AND litter_id        IS NULL
                               AND subject_line_id  IS NULL
            WHEN 'line'   THEN subject_line_id  IS NOT NULL
                               AND subject_mouse_id IS NULL
                               AND subject_cage_id  IS NULL
                               AND subject_slot_id  IS NULL
                               AND litter_id        IS NULL
                               AND subject_mate_id  IS NULL
            WHEN 'mice'   THEN subject_mouse_id IS NULL
                               AND subject_cage_id  IS NULL
                               AND subject_slot_id  IS NULL
                               AND litter_id        IS NULL
                               AND subject_mate_id  IS NULL
                               AND subject_line_id  IS NULL
        END
    );

-- ---------------------------------------------------------------------------
-- 3. case_mice join table
-- ---------------------------------------------------------------------------
-- Membership of mice in a batch case. Soft-deleted via deleted_at (repo rule).
-- A mouse is a live member iff deleted_at IS NULL.
CREATE TABLE case_mice (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    case_id    BIGINT      NOT NULL REFERENCES cases (id),
    mouse_id   BIGINT      NOT NULL REFERENCES mouse_meta (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TRIGGER case_mice_set_updated_at
    BEFORE UPDATE ON case_mice
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Uniqueness: a mouse can only be a live member of a given case once.
CREATE UNIQUE INDEX case_mice_member_key
    ON case_mice (case_id, mouse_id)
    WHERE deleted_at IS NULL;

-- Lookup: all live members for a case.
CREATE INDEX case_mice_case_idx
    ON case_mice (case_id)
    WHERE deleted_at IS NULL;

-- Lookup: all live cases for a mouse.
CREATE INDEX case_mice_mouse_idx
    ON case_mice (mouse_id)
    WHERE deleted_at IS NULL;
