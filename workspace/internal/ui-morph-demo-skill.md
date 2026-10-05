---
id: ui-morph-demo-skill-muvl5ax7
title: UI Morph Demo — Skill
doc_type: skill
updated_at: '2026-10-05T18:30:51.019Z'
published_at: '2026-10-05T18:46:58.472Z'
---

## What this skill is for

`ui-morph-demo` is a Claude Code skill (style preset) for producing short, looping product-demo videos in the "single morphing shape" format popularized by a certain genre of slick Twitter/X product reels: one black pill-shaped UI element continuously reshapes — via shared-element ("FLIP-style") transitions, never a hard cut — through a chain of real product states (an idle button, an async loading/success state, a feature card, a data/chart view, a search surface) before looping seamlessly back to its opening frame.

It was built after reverse-engineering a 14-second reference clip frame by frame: identifying the stage, color, shape, typography, and choreography rules that make a dozen unrelated UI components read as one continuous, satisfying object, then distilling that into a reusable production rubric and a swappable beat skeleton.

It is **not** a renderer on its own — it's a style layer on top of the existing `motion-graphics` skill, which owns the actual `seek(t)` / Playwright / ffmpeg pipeline that turns a timeline into pixels. `ui-morph-demo` supplies the tokens (one accent color, pill/card radius system, cursor-driven narrative, one hard-cut budget, count-up number choreography) and the beat structure; `motion-graphics` does the rendering.

## When to reach for it

Use it when a brief is close to: "a short looping reel where one shape turns into different parts of the product, like that slick Twitter demo video." Good fits: dashboards, media/audio tools, productivity apps, anything with a chain of distinct, demo-able async actions and data views. Bad fits: single-screen products, or anything whose story is emotional/narrative rather than feature-chain — forcing this format onto a product that doesn't have 4-7 clean, real UI states to chain together is the fastest way to make the result read as templated rather than designed.

## How it's structured

- **SKILL.md** — the method: confirm the product actually fits the format, inventory 4-7 real features that each resolve to one clean UI state, map them onto the beat skeleton, score the stage/palette/shape plan against the rubric *before* writing any code, build as one `seek(t)` file, contact-sheet and verify. Plus six hard rules (one hard cut max, exactly one accent color, cursor always visible as the actor, numbers that roll instead of popping, first/last frame identical for a seamless loop, closing on a one-line statement rather than mid-action).
- **reference/style-scale.md** — the full element inventory (stage, color, shape language, typography, the core shared-element morph technique, data/number choreography, pacing, close) plus a 10-axis, 0-4 scoring rubric (stage isolation, color discipline, shape consistency, transition technique, cursor narrative, data animation, cut discipline, loop, close, duration/density) for judging whether a plan or a render actually matches the reference style before calling it done.
- **reference/beat-template.md** — a 12-row swappable choreography skeleton (idle element → async feedback → primary feature card → live manipulation → secondary control → tab/segment switch → data payoff → live re-query → one hard cut → live input on the new surface → resolution → tagline close → loop back to frame one) with guidance on mapping a *new* product's real features onto each row without inventing fake ones.

## Provenance note

The style rubric and beat skeleton describe a production *pattern* abstracted from watching a reference video — they do not reproduce or quote the reference video's own script, footage, or branding. Any new output built from this skill should pull its actual colors, copy, and UI content from the real product being demoed, never from the reference clip.

---

### Full skill text

#### SKILL.md

---
name: ui-morph-demo
description: Build a product demo reel in the "single morphing shape" style — one UI element continuously reshapes through a chain of real product states (button, loader, card, slider, toggle, chart, search) with no hard cuts, then loops seamlessly back to frame one. Use whenever the ask is a short (10-20s) looping product/feature demo video, "make a demo like that Twitter morph video," a landing-page hero loop, or an app-store preview that should feel like one continuous shape-shift rather than a slideshow of screenshots. Built on top of the motion-graphics skill's seek(t)/Playwright/ffmpeg pipeline; this skill is the style preset, not a separate renderer.
---

A reusable style preset for one specific product-demo format: a single element (usually a pill button) that continuously morphs — via shared-element/FLIP-style transitions, never a cut — through a chain of real UI states, each one demonstrating one feature, closing with a one-line brand/tagline beat and a seamless loop back to the opening frame.

This skill does not render anything on its own. Use `motion-graphics` for the actual `seek(t)` / Playwright / ffmpeg pipeline — this skill supplies the style tokens, beat structure, and verification rubric that make the output match the reference format instead of a generic AI-motion default.

**Read as needed, don't load both up front:**
- `reference/style-scale.md` — the element inventory and 10-axis scoring rubric derived from the canonical reference reel. Read before designing the stage/palette/shape system, and again before calling a render "on-brand."
- `reference/beat-template.md` — a swappable beat-sheet template (the exact choreography skeleton: button → async state → feature card → feature card → data/chart card → search/command beat → tagline → loop) for mapping a new product's real features onto the same structure.

**When to use this vs. plain `motion-graphics`:** Use this preset when the brief is close to "a short looping reel where one shape turns into different parts of the product, like a slick Twitter demo." Use plain `motion-graphics` with no preset when the brief wants a different shape (brand film, kinetic type, camera-driven explainer, multi-element scene) — forcing every demo into the single-morphing-pill format when the product or the ask doesn't fit it is the fastest way to make it read as a template rather than a design.

**The method:**
1. Confirm the reference is actually right for this product. This format sells well for apps whose core value is a chain of distinct, demo-able UI states (dashboards, media/audio tools, productivity apps, anything with async actions + data views). It fits poorly for products whose story is one screen, or a narrative/emotional story — don't force it.
2. Inventory the product's real features and pick 4-7 that each resolve to one clean UI state. One button action, one or two content cards (the actual product UI, not invented chrome), one data/stat view if the product has one, one search/command surface if it has one. Pull exact colors, type, and component shapes from the live product or its design tokens — never invent the product's own UI from imagination.
3. Map the chosen features onto the beat-template's skeleton, in the order that reads as a natural user journey (idle → action → result → explore the result → a second surface → close). Keep the skeleton even as the content changes per product.
4. Score the stage/palette/shape plan against the style-scale rubric before writing code. A plan that's already weak on stage isolation, color discipline, or shape consistency will not be fixed by better animation later.
5. Build it as one `seek(t)` file per motion-graphics's technical pipeline. One morphing container is the whole piece; everything else cross-fades or re-draws inside it, never as independent competing motion.
6. Contact-sheet, fix, verify exactly as motion-graphics describes, then run the 10-axis scale as an additional pass specific to this format.

**Hard rules specific to this preset:**
- One hard cut maximum. Everything else is continuous morph.
- Exactly one accent color, everything else is black/white/neutral gray.
- The cursor is a visible character, not an implied one.
- Numbers that change must roll/count, not pop.
- First and last frame are the same shape in the same state.
- Close on one line, not on an action.

#### reference/style-scale.md

Derived from a frame-by-frame analysis of a 14-second reference reel (a silent, looping "morphing pill" product demo).

**Reference beat sequence observed:** One black pill-shaped element morphs continuously through: idle button → loading spinner → success checkmark → media-player card (with a live scrubber drag) → volume slider (live drag) → toggle switch → 3-way segmented control → analytics card with a count-up stat and a redrawing line chart (plus a hover tooltip, plus a live tab-switch that re-rolls the number and reshapes the chart) → one hard cut → command-palette/search surface with a live-typed query → a filtered result → a confirmation pill stating a one-line tagline → morph back down into the original idle button, closing the loop. ~28 beats across 14 seconds, roughly 0.5-1s held per beat.

**Element inventory:**
- *Stage:* flat solid neutral canvas, no app chrome, generous negative space, one soft consistent drop-shadow under every element (single light source from above).
- *Color:* near-monochrome (black/white/off-white) plus exactly one accent color on exactly one small element; gray reserved strictly for disabled/unselected states.
- *Shape language:* stadium/pill radius on small controls, one consistent larger rounded-rect radius on cards.
- *Typography:* one geometric/grotesk sans family; bold for hero content, regular/gray for secondary captions.
- *Core technique:* continuous shared-element (FLIP-style) morphing — one shape persists and reinterpolates across the whole piece; a visible animating cursor drives every interaction.
- *Data/number choreography:* odometer-style digit-roll on changing numbers, charts redraw/re-path in sync, a hover tooltip appears at least once to sell "this is live."
- *Pacing and cuts:* exactly one hard cut in the whole piece; each beat holds ~0.5-1s; first and last frame identical for seamless looping.
- *The close:* ends on a one-line brand/tagline statement, not mid-action.

**Scoring rubric (0-4 per axis):** Stage (busy/chrome-heavy → flat isolated canvas), Color discipline (many colors → monochrome + one accent), Shape consistency (arbitrary radii → one pill + one card radius system), Transition technique (hard cuts → continuous morph), Cursor narrative (no cursor → cursor drives every beat), Data animation (numbers pop → count-up + chart redraw + tooltip), Cut discipline (many cuts → zero-or-one hard cut), Loop (mismatched ends → identical first/last frame), Close (ends mid-action → one-line tagline close), Duration/density (dragging pace → ~0.5-1s per beat, 10-15 beats in 12-15s).

*Note on sound:* this analysis is visual-only. A future reference with a voiceover or music-sync cue worth matching should add an 11th axis for sound design rather than guessing.

#### reference/beat-template.md

A swappable choreography skeleton (keep structure fixed, swap content per product):
1. Idle action element — the product's primary CTA; also the loop's landing frame.
2. Async feedback (loading → success) — the product's own async pattern.
3. Primary feature card — the core content view the product is "for."
4. Live manipulation of beat 3 — one real gesture the product supports (drag/scrub/resize).
5. Secondary control — a slider/toggle/switch tied to a real setting.
6. Tab/segment switch — a real filter/grouping the product offers.
7. Data/stat payoff — a real metric, with a chart or count-up if one exists.
7b. Live re-query of beat 7 — switch the same tab/segment again; number/chart redraws.
8. **Hard cut** (budget: one per piece) — a genuinely separate product surface (search, command palette, settings, onboarding).
9. Live input on the new surface — typing, a shortcut, a selection.
10. Resolution of beat 9 — the result of that search/command/input.
11. Tagline/brand close — one short line: a value prop, a result stat, or a brand statement.
12. Morph back to beat 1's exact shape/state — no new content, literally the same pixels as frame 1.

Guidance: walk the actual live product and name the real UI state for each row; cut a row rather than inventing a fake feature if there's no honest match. Pull every color/radius/icon/type choice from the product's own design tokens or computed styles. Re-check the finished beat list against the style-scale rubric, especially cut-discipline and loop, since it's easy to let the one hard cut multiply once a second surface is in play.
