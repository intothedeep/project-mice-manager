# Colony app — what works today

> Snapshot of the running app on 2026-09-23, at migrations `0001`–`0032`, written
> for review.
> This is a SNAPSHOT, not a specification. `PLAN.md` holds the intent; this file
> describes what the software actually does right now, and will go stale.

**Everything below runs in a web browser on 27 sample mice. Nothing is saved to a
server yet — reload the page and edits are gone.** That is deliberate: the shape of
the data and the flow of work are being proven first, and the database is built
after they are right, not before.

Each flow is marked:

- **① Working** — you can do it in the browser today
- **② Half-built** — the data model exists, but there is no screen for it yet
- **③ Not started**

---

## Questions for the professor

These are numbers the software already acts on that nobody has confirmed. They were
chosen as placeholders by whoever wrote the code, and the app is showing dates based
on them today.

| Event | Timing now in use | Source | Confirm or correct |
|---|---|---|---|
| Plug check, after mating | **+10 days** | shown on the Upcoming screen | ? |
| Plug check, after mating | **+5 days** | a second, unused copy in the server code | ? |
| Expected delivery, after mating | **+20 days** | shown on Upcoming | ? |
| Wean, after birth | **+21 days** | shown on Upcoming | ? |
| Genotyping, after birth | **+21 days** | shown on Upcoming | ? |

**The plug-check number exists twice and disagrees with itself** — +10 in what you
see, +5 in a piece of server code that nothing currently calls. Only one can be
right. Whatever you decide, these move into a settings table so they can be changed
without a programmer (③, not built).

Two more, smaller:

- **Genotype notation.** `Nf1` shows both copies, e.g. `Nf1 f/+`. `PlpCre` and `WT`
  show no copies at all. Is that the right distinction — some markers carry a pair
  and some do not?
- **Transgene notation.** `PlpCre` and `ccEGFP` are inserted transgenes, so they
  have no allele pair — only one copy or two. The app is being changed to record
  that as `Tg/+` for one copy and `Tg/Tg` for two, which displays as `ccEGFP` and
  `ccEGFP(hmo)`. Two things to confirm: **is `Tg` the token you use**, and **is
  `(hmo)` written only for homozygous**, or do you also mark the one-copy case
  (`(het)`, `(hemi)`) rather than leaving it bare?
- Recording it this way also captures **which parent a transgene came from**,
  which the `(hmo)` suffix alone cannot. Is that worth having?

---

## The flows

| # | Flow | State | What you can do today |
|---|---|---|---|
| 1 | See the colony | ① | Rack view: lines → cages → slots → mice. Click any level to highlight it and everything under it. Filter by genotype, sex, age. |
| 2 | Mouse identity | ① | Every mouse shows a computed name, e.g. `M4BCW.2`. |
| 3 | Genotype | ① | Each mouse carries a list of gene rows; the genotype string is assembled from them. |
| 4 | Ear / toe marking | ① | Record and remove toe, ear and other marks. Removals stay in the history. |
| 5 | Add animals | ① | Add a mouse, a slot, a cage or a whole line. |
| 6 | Move a mouse | ① | Drag a mouse to another cage or slot. |
| 7 | Tasks (“cases”) | ① | Create any of 10 task types, assign, and move them through todo → doing → done → verified. |
| 8 | Task auto-generation | ② | Nothing is generated automatically yet. All tasks are created by hand. |
| 9 | Breeding records | ② | Mates, litters, plug, delivery and wean exist as task types, but there is no “record this litter” screen. |
| 10 | Spreadsheet import | ② | The structure to hold imported rows exists; there is no import screen. |
| 11 | Genotype colours | ① | Mutant genotypes are tinted; wild-type and unknown are left blank so mutants stand out. |

---

## 1–2 · Seeing the colony, and how a mouse is named

The screen mirrors the physical rack: **line → cage → slot → mouse**. Clicking a
cage highlights the cage, its slots, and its mice; clicking a mouse highlights the
cage and slot it sits in. One click, both directions.

**A mouse's name is never typed. It is assembled from its own record**, so it cannot
drift from the truth:

```
M 4 BCW .2
│ │  │   └── number of tissue collections (shown only from the 2nd)
│ │  └────── litter code
│ └───────── pup number within the litter
└─────────── sex
```

An ear punch adds an `e` per punch, so a mouse punched in both ears reads
`F11BEVee`. Change the sex, and every place that shows that mouse — its own row, its
children's parent columns, the drawer — updates together, because they all rebuild
the name from the same record.

**`WT` is a label, not a litter.** Mice labelled `WT` are wild-type stock, so they do
not share a birth date, a mother or a father. Every other litter code does. The
software treats `WT` as an exception on purpose.

## 3 · Genotype

A mouse does not store a genotype string. It carries **one row per marker**, and the
string is assembled for display:

```
rows:  PlpCre (one copy)  +  Nf1 (maternal f, paternal +)
shown: PlpCre;Nf1 f/+
```

- The **left copy is maternal**, the right paternal.
- **No rows at all** means *not yet genotyped* and shows `?`. This is what would
  trigger a "genes to check" task (③, not wired yet).
- **`WT`** is a real marker row meaning wild type, which is a different statement
  from "not yet genotyped".
- Markers are shown in a fixed order set per marker, so the same mouse always reads
  the same way regardless of the order someone ticked the boxes.

Two kinds of marker are recorded differently, because they are different things:

- **Locus genes** (`Nf1`, `Ai14`) edit a gene already present, so each parent
  contributes a copy and both copies have a state — `Nf1 f/+`, `Ai14 +/-`.
- **Transgenes** (`PlpCre`, `ccEGFP`) are inserted, so there is no pre-existing
  copy to pair with. Only the number of copies matters: one shows as `ccEGFP`,
  two as `ccEGFP(hmo)`.

Available markers: `PlpCre`, `Nf1`, `Ai14`, `ccEGFP`, `WT`.

Both copies of every marker can be set from the mouse drawer: pick the marker,
then set the maternal and paternal side independently from `+`, `-`, `f`, `Tg`,
or leave either as *not recorded*. Leaving both unset is normal for a newly
added animal — you do not know a genotype at the moment you create a mouse.

**Still ambiguous on screen:** a transgene confirmed to have one copy and a
transgene nobody has assessed yet both read as `ccEGFP`. The `(het)` question
above would separate them.

## 4 · Marking

Toe, ear, other, and "untagged". **Every mouse always carries at least an "untagged"
record**, so an unmarked animal is a positive fact rather than an absence — you can
find every mouse that still needs marking. Removing a mark keeps it in the history,
struck through, rather than erasing it.

## 7 · Tasks

Ten task types, each asking for what it needs:

| Task | Asks for |
|---|---|
| Mate | mother, father, mating date |
| Plug check | cage |
| Birth / delivery | cage, pup count |
| Wean | litter |
| Genes to check | mouse, which genes |
| Tissue collection | mouse, collection date |
| Genotyping | mouse, markers, PCR date |
| Move | mouse, destination cage |
| Check food | area |
| Sac | mouse, reason |

Status moves **todo → doing → done → verified**. Staff can take a task to *done*;
only the professor can mark it *verified*.

## 8 · Auto-generation — the main gap

Today every task is created by hand. The intended behaviour is that recording a
mating schedules its plug check and expected delivery, and recording a birth
schedules weaning and genotyping.

The date arithmetic exists (that is where the +10/+20/+21 above come from) and two
generator functions exist on the server, but **nothing calls them**. The settings
table that would hold the offsets is not built. This is the single largest
difference between what was designed and what runs.

## 9 · Breeding

Mating, litters, plug checks, delivery and weaning all exist as *task types* you can
create by hand (①), and the underlying record structure exists (②) — but there is no
screen that says "this litter was born, here are the pups." That screen, and the
automatic litter code and pup numbering that go with it, are ③.

## 10 · Spreadsheet import

The structure to ingest the existing spreadsheet — raw rows, batches, error
reporting — exists in the data model. Columns for mate, mating date, plug, expected
delivery, tissue and genotyping dates are not yet surfaced anywhere in the app. No
import screen exists.

There is one open question the import cannot resolve on its own: when one sheet
shows both `M1A` and `M1+10A`, are those the same animal? About 4% of rows
(146 of 3528) are affected. They are excluded from import until this is answered.

## 11 · Colours

Mutant genotypes are tinted; **wild type and unknown are deliberately left blank** so
mutants stand out on a full rack. The tints are currently hand-assigned per genotype.
The agreed replacement — every genotype gets a colour automatically the first time it
appears — is designed but not built (②).

---

## What this means for the MVP

The **shape** of a mouse — its identity, genotype, marks, and place on the rack — is
built and behaves correctly. The **work that happens to a mouse over time** is
half-built: tasks can be created and tracked by hand, but nothing schedules itself,
and there is no way to record a litter or import the existing spreadsheet.

The most useful things to decide next are the timing numbers at the top, and whether
scheduling or spreadsheet import matters more to get first.
