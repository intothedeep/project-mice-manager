-- The six P0 enums (P0.2, amended R10).
--
-- Under R7 the `mice` table carries no life-state, so three of these are not
-- used as column types anywhere in P0.2. They are NOT dead schema: they are the
-- canonical value domains, enforced at the mouse_attr_logs write path (see the
-- validation trigger in 0004) and read by the Excel-familiar grid, whose colour
-- cues must derive ONLY from enum/status fields.

-- Uppercase deliberately: matches the mouse-ID grammar's [M|F] prefix.
-- U = unknown. Newborn pups are U and do NOT warn; a bare non-pup ID is U WITH
-- a warning. Never guess a sex (plan Q4).
CREATE TYPE sex AS ENUM ('M', 'F', 'U');

-- Ticket lifecycle: open -> done -> verified / cancelled.
CREATE TYPE task_status AS ENUM ('open', 'done', 'verified', 'cancelled');

-- 'breeder' / 'experimental' are evidence-backed (the workbook's "Male breeders
-- cages" / "Experimental cages", and the dashboard's breeders/experimental
-- counts). 'dead' is the single terminal state, merging sac and found-dead per
-- the meeting note "sac -> dead -> gray box".
-- 'unassigned' is a JUDGEMENT CALL (plan Q24): the workbook shows undecided
-- mice ("Breed or Sac", "Exp or Breed"), which need a state before the
-- professor's decision. Confirm the name and whether sac/found-dead should
-- split into two states.
CREATE TYPE mouse_status AS ENUM ('unassigned', 'breeder', 'experimental', 'dead');

-- Yellow = attention/flag in the workbook. Binary until proven otherwise;
-- the label names are a JUDGEMENT CALL (plan Q25) — confirm whether graded
-- levels exist before any UI depends on this being two-valued.
CREATE TYPE attention AS ENUM ('none', 'flag');

-- Font colour semantics: black = done, red = instruction, blue = plan/note.
-- Deliberately NO 'unknown' member — an unmapped colour must route to
-- flag_for_review as an import_errors row, never silently become a default enum.
CREATE TYPE cell_signal AS ENUM ('done', 'instruction', 'plan');

-- R10: tissue_collection and genotyping dates occupy cols M/N at 97/98% fill.
-- ONE ROW PER DATE in mouse_events (a cell can hold '260629 260817').
CREATE TYPE mouse_event_kind AS ENUM ('tissue_collection', 'genotyping');

-- Shared trigger function: keeps updated_at current on every UPDATE.
-- Attached to EVERY table via BEFORE UPDATE FOR EACH ROW triggers in each file.
CREATE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
