# QA checklist — Self-Made Legends

Two checklists. The first is run by a human on every agent output before it
leaves the building. The second is run on a physical sample when it arrives.

Anything marked **STOP** halts the process. It does not get a note and a shrug.

---

## Part A — agent output, before it goes anywhere

Most of these are enforced automatically by `agents/evals/run.js`. Run through
them by hand anyway on anything going to a factory, because an eval can only
catch what someone thought to write down.

### Brand
- [ ] **Self-Made Legends** written hyphenated, everywhere — **STOP** if not
- [ ] No other brand's name, logo, likeness or signature design referenced — **STOP**
- [ ] Colours are house colours; no third loud colour introduced without a reason
- [ ] Product name is in the house register, not a slogan

### Truthfulness — the expensive ones
- [ ] **No invented numbers.** Every weight, count, code, price and lead time is
      either sourced or marked `UNKNOWN` — **STOP** if a number appeared from nowhere
- [ ] Fabric weights inferred from a photo are given as a **range** and marked inferred
- [ ] No hex value presented as a colour standard — **STOP**
- [ ] No claim that could not be defended in front of a regulator
- [ ] Confidence score present, and not 1.0

### Makeability
- [ ] Every gold area is **embroidered**, not printed — **STOP**
- [ ] Every embroidered area has a stitch count estimate
- [ ] No detail below ~2mm stroke width in an embroidered area
- [ ] The design is makeable under wholesale with no upfront inventory
- [ ] Nothing requires a capability no partner has

### Tech pack specifically
- [ ] Every measurement has a tolerance — **STOP** if any is missing
- [ ] Full graded size run, not one base size and "grade accordingly"
- [ ] Every measurement taken from a named fixed landmark
- [ ] Bill of materials includes labels, hangtag, packaging — not just fabric
- [ ] Digitising approval clause present — **STOP** if missing
- [ ] `open_questions` is not empty
- [ ] Every `UNKNOWN` in the document appears in `open_questions`

### Routing specifically
- [ ] Chosen partner can actually make every line — **STOP**
- [ ] A split shipment has a stated reason
- [ ] The promised delivery date is met, or the miss is flagged
- [ ] No address was silently "corrected"
- [ ] Border crossings flagged; no duty amount quoted

---

## Part B — physical sample

### On arrival
- [ ] Photograph before touching it — front, back, both sleeves, every
      decorated area, all labels, and one raking-light shot of the embroidery
- [ ] Log the arrival date against the promised date

### Against the tech pack
- [ ] Every point of measure checked and recorded — not spot-checked
- [ ] Each within tolerance; record the actual number, not "OK"
- [ ] Fabric weight verified on a scale, not by feel
- [ ] Hand-feel matches the approved swatch
- [ ] Colour checked against the **physical** standard under D65, not on a screen

### Embroidery — where samples fail most often
- [ ] Position measured from the landmark, not eyeballed
- [ ] Dimensions correct
- [ ] No blobbing or fill-in on fine detail
- [ ] Metallic thread is genuinely metallic, not a gold-coloured polyester
- [ ] Ground fabric not puckered or distorted
- [ ] Backing not visible from the face
- [ ] Reverse is clean — no loose bobbin, no jump stitches left uncut

### Construction
- [ ] Seams straight, even SPI, no skipped stitches
- [ ] Bartacks present at every stress point specified
- [ ] Rib recovers after stretching — pull it and let go
- [ ] No raw edges
- [ ] Labels correct, correctly placed, and legible

### Wash test — do it before bulk, every time
- [ ] Wash one sample to the care label you intend to print
- [ ] Shrinkage measured and recorded, all points
- [ ] No colour bleed onto a white swatch
- [ ] Embroidery intact, no puckering after drying
- [ ] Print, where used, not cracked

### Verdict
- [ ] **Approved** — proceed to bulk
- [ ] **Approved with comments** — proceed, corrections listed, re-check at inline
- [ ] **Rejected** — second sample required, with the reasons written out

> Whatever the verdict, put it into the review UI against the run that produced
> the tech pack. A sample that came back wrong is the most valuable training
> signal this system will ever get, and it is worthless if it lives only in
> somebody's inbox.
