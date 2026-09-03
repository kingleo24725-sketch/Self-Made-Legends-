# Self-Made Legends — logo pack

**The seal is the logo.** It carries the full name and the founding year, and
it is what goes on business cards, packaging, a letterhead, an about page —
anywhere the brand has to introduce itself. When in doubt, send the seal.

Two other marks ship alongside it and are optional. The *lion crest* is a
product mark, for a garment or a badge where the name is already obvious;
the *lockup* is that crest with SML beneath it.

Never squeeze the wordmark under the bare crest yourself; the lockup exists
because the crest's lowest mane lock sits where that type wants to be.

Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.

Rebuild with `node brand/build-logo.js`. Everything lands in `brand/out/`, and
the two standalone seals under `website/assets/brand/` are written from the
same function so the site and the print pack cannot drift apart again.

**Never hand-edit a seal SVG.** They did drift, and the way it showed up is
worth knowing: the seal's arc text is set on two semicircular paths, and a
`textPath` runs along its path's own direction. Flip the bottom arc's sweep
flag and nothing errors, nothing warns, the file still opens — **EST. MMXXVI
just silently sets reversed and upside down.** At the size a seal is normally
looked at, that is eight characters across a few dozen pixels, and it lived
on the site for weeks. Change the geometry in `build-logo.js` and rebuild.

---

## Which file to send

| Job | File |
|---|---|
| **Business cards, boxes, anything printed** | `sml-seal-<variant>.pdf` |
| A designer placing it in a layout | `sml-seal-<variant>.svg` |
| Web, social, a supplier who insists on an image | `sml-seal-<variant>-transparent.png` |

**The PDF is the one to send a printer.** It is vector, so it can be blown up
to the side of a building without softening, and Chromium embeds the two
typefaces inside it — the printer installs nothing and cannot substitute a
different font by accident.

`BodoniModa.ttf` and `DMMono.ttf` ship alongside for anyone who has to set
matching type themselves.

---

## Four variants, and why

The seal on the website is a gold **gradient**. That is right on a screen and
wrong nearly everywhere print is concerned.

| Variant | Use it for |
|---|---|
| `gradient` | Screens. Full-colour digital printing. |
| `gold` | **Foil stamping.** One flat colour. |
| `black` | Embossing, debossing, one-colour print, light stock. |
| `white` | Reversing out of a dark box or dust bag. |

**Foil is metal pressed into paper. It has one colour and cannot hold a
gradient.** Send a printer the gradient for a foil job and you get back either
a refusal or a muddy approximation. Same for embossing, where there is no ink
at all and only the shape survives — which is why the mark is drawn to work as
a plain silhouette.

Most box printers quote one-colour cheapest. `black` and `gold` are that job.

---

## Colour

```
  Gold          #CFA529      the house colour, authoritative
  Gold, deep    #8F6E15      gradient shadow only
  Gold, light   #F6E4A6      gradient highlight only
  Ground        #0B0F0D      the near-black behind it
```

There was a second gold in circulation — `#C9A227`, with `#8A6B14` and
`#F2DFA0` either side of it — in the standalone seal files, both favicons and
four pages' header crowns. Three points off `#CFA529` and invisible on screen,
which is why nobody caught it. It is not invisible in print: hand a foil house
two hexes and you get two golds across your cards and your boxes. Everything
is now on `#CFA529`. **One gold. Do not let a second one back in.**

Hand your printer the **hex**, and ask them to match. Do not let anyone pick a
Pantone for you off a screen — ask for a **printed draw-down or a proof** on
your actual stock before the run. Metallic gold foil in particular looks
nothing like `#CFA529` on a monitor, and the only way to choose is to hold
samples.

## Clear space and minimum size

Keep clear space of **at least 10% of the seal's diameter** on every side.
Nothing sits inside that ring.

Do not print the seal below **15 mm / 0.6 in** across. Under that the
letterspaced arc text closes up and the laurel leaves fill in. If you need it
smaller than that — a woven label, a metal pin — ask for a **simplified
version with the arc text dropped**, keeping the crown, the SML and the rings.

---

## Before you file a trademark — read this

**What follows is a screening, not a clearance search, and you must not treat
it as one.** The USPTO's own search system is unreachable from where this was
run, so none of this came from the register itself. It is a web search. A real
clearance search reads the actual register, including marks that are similar
but not identical, and interpreting it is a legal judgement.

### What the screening found

**No exact "Self-Made Legends" turned up** in apparel. That is mild
encouragement and nothing more — plenty of registered marks never surface in
a web search.

**Three neighbours sit in your exact category:**

- **Legends** — athlete-owned apparel, Los Angeles, founded 2019, roughly $7M
  raised. Well-resourced, and well-resourced brands defend names.
- **Legends Clothing Co.** — San Francisco, founded 2016, sports streetwear.
- **SELFMADE®** — Irish streetwear and activewear, using the ® symbol.

A separate **SELFMADE** registration by Stephanie Lee appears to sit in
**Class 35** (retail services) rather than Class 25 (clothing). A different
class helps. It does not settle anything.

### The class you need

**Class 25 — clothing, footwear, headwear.** It is one of the most crowded
classes on the register, which is exactly why "nothing showed up on Google"
is not an answer.

### What to actually do

1. Search `tmsearch.uspto.gov` yourself for *self made*, *selfmade*, *legends*
   and *self made legends*, in Class 25. Free, and it takes an hour.
2. Then pay a trademark attorney for a clearance opinion before you file.
   A few hundred dollars against the cost of rebranding after a cease and
   desist, once boxes and cards are printed.
3. File in **Class 25** first. Add Class 35 later if you open retail.

---

## Does the artwork belong to anyone else?

**The seal is original.** It is drawn from primitives — three circles, a crown
built from one path and three dots, six laurel ellipses, three points, and two
lines of type set on arcs. Nothing was traced, copied or adapted from an
existing mark. The geometry is in `build-logo.js`, so you can prove where every
line came from.

**The typefaces are licensed for this.** Bodoni Moda and DM Mono are Google
Fonts published under the SIL Open Font License, which permits commercial use
including inside a logo. Confirm each font's licence page before you file, and
keep a copy of the licence with your filing papers.

**The lion crest is drawn, not traced.** The version on the product sheets is
a generated raster, and tracing it would have carried across whatever it
happens to resemble — the worst possible start for something about to be
filed. So the crest in this pack is built from geometry in `brand/lion.js`:
a mane whose radius is a function of angle, so the silhouette is a shield
rather than a circle; an angular skull, wide at the temple and cut off in a
broad flat chin; and brows, eyes, muzzle and fangs knocked out of it. Every
curve is a number in that file.

**That does not make it clear to register.** Crowned lions are among the most
common devices in heraldry and in fashion, and originality is not the test —
likelihood of confusion is. Treat it exactly like the name: search it, then
pay someone to tell you what the search means.

**Minimum size for the crest is 20 mm / 0.8 in on foil.** It survives to 15 mm
in flat print, but foil fills in fine strokes and the mane's interior lock
lines are the first thing to close up. Tested at 15, 20, 30 and 58 mm —
`node brand/preview-lion.js out.png` prints that sheet, and `--one` renders
the crest alone at full size.

**Judge it at both.** The first crest shipped as a cartoon because it was
only ever looked at large, where a soft mouth reads as character. It came
back with one word: *weak*. The redraw changed six things, and every one of
them is a decision anyone reworking this could make again by accident —
they are listed at the top of `brand/lion.js` with what each one did to the
mark.
