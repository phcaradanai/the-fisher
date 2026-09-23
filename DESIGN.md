---
name: King Fisher
description: Floatline Signals for the Village Canal’s first fishing chapter.
colors:
  canal: "#103f43"
  canal-deep: "#0d343a"
  water: "#15565a"
  waterline: "#8bb597"
  reed: "#7d7043"
  ochre: "#bd9151"
  coral: "#b94731"
  coral-bright: "#f07855"
  mint: "#a7c9a8"
  paper: "#f1ecd9"
  paper-deep: "#e3d8b5"
  ink: "#173c3d"
  muted-ink: "#456a67"
  line: "#b7b99a"
  white: "#fffdf3"
  danger: "#8e342b"
typography:
  display:
    fontFamily: "Kanit, sans-serif"
    fontSize: "clamp(1.7rem, 2.4vw, 2.3rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Kanit, sans-serif"
    fontSize: "clamp(1.5rem, 2vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Kanit, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 500
    lineHeight: 1.25
  body:
    fontFamily: "Anuphan, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Kanit, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 500
    letterSpacing: "0.015em"
rounded:
  sm: "5px"
  md: "8px"
  lg: "12px"
  xl: "14px"
  mobile-scene: "10px"
spacing:
  space-1: "0.35rem"
  space-2: "0.65rem"
  space-3: "1rem"
  space-4: "1.4rem"
  space-5: "2rem"
  space-6: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.coral-bright}"
    textColor: "#291d19"
    rounded: "{rounded.md}"
    padding: "0.55rem 1.1rem"
    height: "56px"
  button-fight-pull:
    backgroundColor: "#e0c38d"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.55rem 1.1rem"
    height: "48px"
  spot-select:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.4rem 2rem 0.4rem 0.65rem"
    height: "42px"
  section-nav:
    backgroundColor: "{colors.canal-deep}"
    textColor: "#d2ded1"
    padding: "0.35rem 0.7rem"
    height: "56px"
  field-notes-card:
    backgroundColor: "{colors.paper-deep}"
    textColor: "#274a45"
    rounded: "{rounded.lg}"
    padding: "1.1rem 1.15rem 1.3rem"
  tension-readout:
    backgroundColor: "#e5dec3"
    textColor: "{colors.ink}"
    padding: "0.65rem 0.55rem"
  king-rarity-marker:
    backgroundColor: "{colors.coral-bright}"
    textColor: "#923d2c"
    size: "11px"
---

# Design System: King Fisher

## Overview

**Creative North Star: “Floatline Signals”**

The canal is a working place with room to watch. Deep teal water and warm paper establish the scene; reed ochre and mint mark the bank and state; coral gives the float and primary action a clear signal. The tone stays calm between bites and becomes more urgent through the float, line, and fish—not through a dashboard taking over the water.

Kanit gives headings and measurements a compact tackle-gauge voice; Anuphan keeps Thai and English descriptions open and readable. The game uses authored, replaceable PixiJS geometry because final artwork is not available. The float’s submersion, moving line, ripples, and fish direction supply the signature; numeric meters and words confirm what the scene is saying.

**Key Characteristics:**
- Water-first composition; the float leads fight state.
- Warm paper panels against a saturated canal field.
- Coral action signal; mint and shape-coded secondary states.
- Bilingual copy, explicit labels, and replaceable scene geometry.

## Colors

The palette pairs saturated canal teal with warm paper, reed ochre, and a coral float signal; color reinforces state without carrying it alone.

### Primary
- **Canal Teal** (`colors.canal`): Owns the main masthead and the player’s visual anchor.
- **Deep Canal Green** (`colors.canal-deep`): Frames the browser surface and navigation.
- **Living Water Teal** (`colors.water`): Carries the canal surface and secondary signal marks.
- **Waterline Sage** (`colors.waterline`): Marks boundaries and active water-state edges.

### Secondary
- **Reed Olive** (`colors.reed`): Grounds reed-bank details.
- **Sunlit Ochre** (`colors.ochre`): Identifies wood, tackle, and warm secondary marks.
- **Canal Mint** (`colors.mint`): Supports equipment and positive-state signals.

### Tertiary
- **Float Coral** (`colors.coral`): Reserved for urgent fish-state marks and tension warnings.
- **Signal Coral** (`colors.coral-bright`): Primary cast/hook action and the visible float.
- **Line-Break Red** (`colors.danger`): Critical line status.

### Neutral
- **Warm Paper** (`colors.paper`): Main reading surface.
- **Deep Paper** (`colors.paper-deep`): Secondary notes and inset panels.
- **Canal Ink** (`colors.ink`): Main text on light surfaces.
- **Muted Green Ink** (`colors.muted-ink`): Secondary descriptions and labels.
- **Sage Divider** (`colors.line`): Quiet panel and readout separators.
- **Ivory** (`colors.white`): Select fields and reverse type.

**The Two-Channel Signal Rule.** State must remain legible through position, shape, words, and numbers; color is never the only cue.

## Typography

**Display Font:** Kanit (with a sans-serif fallback)  
**Body Font:** Anuphan (with a sans-serif fallback)  
**Label/Mono Font:** Kanit for compact controls and numeric readouts; no mono face is used.

**Character:** Kanit is condensed and practical without making the game feel like a technical dashboard. Anuphan carries longer Thai and English copy at a steady reading rhythm.

### Hierarchy
- **Display** (600, responsive 1.7–2.3rem, 1.08 line-height): Product and chapter identity.
- **Headline** (600, responsive 1.5–2rem, 1.2 line-height): Fishing spots, panels, and section names.
- **Title** (500, 1.2rem, 1.25 line-height): Story entries and content records.
- **Body** (400, 1rem, 1.55 line-height): Descriptions and narrative; longer story copy stays near 70ch.
- **Label** (500, 0.85rem, 0.015em tracking): Controls, readouts, and measurements; tabular numerals keep values aligned.

**The Gauge Voice Rule.** Use Kanit for headings and measured state; use Anuphan for explanatory copy. Do not substitute a system display face or use monospace as costume.

## Layout

The shell is centered and capped at 1760px. Desktop fishing uses a broad scene column beside a compact field-notes column; the scene takes roughly two-thirds of the working width. At 1050px the notes move below the scene. At 700px the interface becomes a single-column, full-width play surface with horizontal section navigation. At 390px the scene tightens to a 1.5:1 frame and tension/stamina readouts share a row so the first CAST action remains visible at 844px. Spacing follows the six `space-*` steps; larger gaps separate a new section from its heading, while control groups stay compact.

## Elevation & Depth

Depth is a restrained hybrid: paper and canal fields provide most separation, thin outlines define panels, and a soft lift belongs mainly to the canal frame. The shell receives a broad ambient shadow; action buttons gain a short shadow only on hover. Do not lift every card or use a hard offset block shadow.

**The Scene Lift Rule.** Keep the largest shadow under the live canal frame; reading panels rely on tone and borders.

## Shapes

Controls use gently rounded corners (8px); field notes and story panels use broader corners (12px), and the canal frame opens to 14px on desktop and 10px on narrow screens. Small navigation signals use distinct circles, squares, and lozenges so sections remain recognizable without glyph icons. The float and line are crisp authored geometry, not faux photographic texture.

## Components

### Buttons
- **Shape:** Gently rounded (8px), with a minimum 48px hit area.
- **Primary:** Cast, hook, and sell use signal coral, dark text, and a 56px control height.
- **Fight actions:** Pull, release, reel, and special move receive separate surface colors and explicit labels; the action name stays visible.
- **Hover / Focus:** A short upward hover lift, downward active press, and a 3px visible coral focus outline. Disabled controls remain dark and text-labeled.

### Cards / Containers
- **Corner Style:** Field notes use a soft 12px corner; the scene frame uses 14px desktop and 10px mobile.
- **Background:** Warm paper for the page, deeper paper for notes, dark canal teal for the live play surface.
- **Shadow Strategy:** The scene gets the main lift; field notes use a quiet border and tonal fill.
- **Internal Padding:** Notes use about 1.1rem; mobile panels tighten to 0.8–0.9rem.

### Inputs / Fields
- **Style:** The fishing-spot selector is a white, 42px field with an 8px corner and a muted green outline.
- **Focus:** A 3px coral `:focus-visible` outline with offset; preserve the native select affordance.
- **Error / Disabled:** Keep locked spots visibly disabled; error copy names the issue and explains that fishing controls remain available.

### Navigation
- **Style:** Dark teal horizontal band with 56px desktop targets, compact labels, and a distinct small geometric signal for each section.
- **Active:** Coral underline and brighter text, not color alone.
- **Mobile:** Horizontal scrolling preserves the same order and touch-sized targets without shrinking every label.

### Float and Waterline
The PixiJS scene is the signature component: the float sinks on a bite, the line connects cast to water, and ripples and fish motion make the canal feel live. Keep it larger than the meters; pair motion with explicit phase, tension, and stamina copy. Honor the reduced-motion setting.

## Do's and Don'ts

### Do:
- **Do** let float position and line motion lead the reading order.
- **Do** pair each color-coded state with a word, shape, or numeric value.
- **Do** keep the first cast available from the Shallow Bank on initial load.
- **Do** keep Thai and English copy equally supported in UI and content.
- **Do** use sourced, self-hosted type and replaceable scene geometry.

### Don't:
- **Don't** replace the living canal with a meter-first dashboard or title hero.
- **Don't** hide CAST below the first mobile viewport.
- **Don't** rely on color alone for bites, tension, rarity, or line failure.
- **Don't** add gradient text, emoji/glyph icons, or imitation photo texture to the authored scene.
