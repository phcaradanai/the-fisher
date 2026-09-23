# Core Rework — Turn-Based Tactical Fishing RPG

You are the Lead Game Designer, Combat Systems Designer, and Senior Game Engineer responsible for restructuring the current King Fisher prototype.

This is a CORE GAMEPLAY REWORK.

Do not simply polish the current realtime fishing system. The current presentation and realtime fishing interaction are not yet sufficiently fun. Replace the primary fishing gameplay with an original:

**TURN-BASED TACTICAL FISHING DUEL**

Conceptual inspirations:
- tabletop RPG decision-making
- D&D-style checks and advantage/disadvantage
- tactical turn-based combat
- Monster Hunter-style creature knowledge
- boss telegraphs
- equipment builds
- collection RPG progression

Do not copy any specific game mechanically or visually.

The goal is:

> FISHING SHOULD FEEL LIKE FIGHTING A UNIQUE CREATURE, NOT WATCHING A TENSION BAR.

## 1. Inspect before modifying

Inspect the existing repository thoroughly.

Identify:
- current fishing gameplay implementation
- React UI
- PixiJS rendering
- fishing state
- fish definitions
- gear definitions
- story progression
- collection
- save system
- Village Canal content
- King Fish implementation
- tests
- reusable assets
- code coupled to the old realtime model

Classify findings as:
- KEEP
- REFACTOR
- REPLACE
- REMOVE

Preserve useful content/story/collection/economy/localization/save work unless it specifically depends on the obsolete combat model.

Provide only a concise plan, then begin implementation immediately.

## 2. Core gameplay pillar

Fishing is now a tactical encounter between ANGLER and FISH.

The player must:
- read fish intent
- anticipate behavior
- manage line tension
- manage distance
- reduce fish stamina
- select actions
- exploit weaknesses
- use equipment intelligently
- manage limited AP
- accept controlled uncertainty

Player decisions must matter much more than RNG.

Target influence:
- Decision quality: dominant
- Build/equipment: important
- Fish knowledge: important
- RNG: supporting tension only

## 3. Turn structure

Use an explicit loop:

TURN START
→ reveal fish intent / telegraph
→ grant player AP
→ player chooses actions
→ resolve player actions
→ resolve fish action
→ resolve statuses
→ update tension / distance / stamina
→ victory/failure check
→ NEXT TURN

Default: **2 AP per turn**.

Tune if playtesting proves a different value is better.

## 4. Core combat variables

Keep the initial model compact.

### Fish Stamina
Represents exhaustion. Reaching zero or a clear catch threshold enables victory.

### Distance
How far the fish is from the player.
The player generally tries to reduce distance.
If the fish escapes beyond the maximum distance, the encounter can fail.

### Line Tension
Use readable bands:
- SLACK
- SAFE
- HIGH
- DANGER
- BREAK

Too little tension should create escape risk.
Too much tension should threaten the line.

### Line Durability
Use only if it creates a meaningful decision separate from tension.

### Statuses
Only implement statuses that change decisions.

Examples:
Fish:
- STAGGERED
- EXHAUSTED
- ENRAGED
- DIVING
- SURFACED
- OFF_BALANCE

Player:
- FOCUSED
- STEADY
- FATIGUED
- OVER_TENSION
- SLACK_LINE

Avoid status bloat.

## 5. Initial player actions

Implement:

### REEL
Reduce distance.
Usually increases tension.

### PULL
Apply stronger stamina pressure / positioning.
Higher tension/risk.

### RELEASE
Reduce tension.
Fish may gain distance.

### BRACE
Prepare against powerful fish movement.
Useful against dash/dive/heavy pull.
Can create counter opportunities.

### OBSERVE
Learn about the fish.
Possible effects:
- reveal next action
- reveal hidden behavior
- reveal weakness
- improve future checks
- add knowledge to encyclopedia

OBSERVE must be strategically useful, not a wasted turn.

### SKILL
Keep minimal in the first prototype.
Use later for angler/equipment abilities.

## 6. Fish telegraph system

This is a primary mechanic.

Fish should communicate meaningful intent before dangerous actions.

Examples:

### DEEP DIVE
Potential consequences:
- +distance
- +tension if player pulls against it

Potential counters:
- RELEASE
- BRACE
- specialized response

### POWER DASH
Rapid escape pressure.

### FAKE DASH
Misleading motion. Use sparingly and fairly.

### RECOVER
Restore stamina/composure or remove negative status.

### THRASH
Strong tension pressure.

### SURFACE LEAP
Creates a tactical opportunity.

The player should normally have enough information to make an intelligent decision.

Boss mechanics may obscure some information later but must never feel arbitrary.

## 7. D&D-inspired checks

Use tabletop-style checks as controlled uncertainty.

Do not roll dice for every action.

Conceptual formula:

roll
+ angler modifier
+ gear modifier
+ status modifier
vs
fish difficulty/resistance

A d20-style system is acceptable.

Support outcome bands:
- CRITICAL FAILURE
- FAILURE
- PARTIAL SUCCESS
- SUCCESS
- CRITICAL SUCCESS

A single bad roll must create a setback, not invalidate several turns of correct decisions.

## 8. Advantage / disadvantage

Reward correct tactical reading.

Example:
Fish telegraphs POWER DASH.
Player chooses BRACE.
→ ADVANTAGE

Poor response:
→ DISADVANTAGE

Prefer this over many tiny hidden percentage modifiers.

The UI must explain why advantage/disadvantage happened.

## 9. RNG

Use centralized seeded RNG.

Do not scatter Math.random().

The system must remain deterministic for:
- tests
- debugging
- encounter replay
- future tournament systems

## 10. Fish behavior archetypes

Fish must differ by behavior, not only stats.

Create reusable archetypes/modules such as:
- CALM
- SPRINTER
- DIVER
- BRUISER
- TRICKSTER
- ENDURANCE
- BERSERKER

Fish definitions compose behavior modules.
Do not hardcode species logic into rendering.

## 11. Fish knowledge

Turn the encyclopedia into gameplay.

Track/reveal:
- known behaviors
- preferred bait
- habitat
- active time
- weaknesses
- dangerous moves
- recommended responses
- best catch
- number caught

Loop:

ENCOUNTER
→ LEARN
→ CATCH
→ RECORD KNOWLEDGE
→ PREPARE BETTER
→ MASTER SPECIES

## 12. Equipment must change playstyle

Do not implement simple tier stat inflation.

Examples:

Flexible Bamboo Rod:
- lower power
- high control
- reduces high-tension penalties

Heavy River Rod:
- high power
- lower control
- stronger PULL

Fast Reel:
- REEL removes more distance
- generates more tension

Heavy Torque Reel:
- slower
- reliable versus heavy fish

Elastic Line:
- wider safe tension range
- RELEASE may concede more distance

Use reusable effects/modifiers.
Do not hardcode gear IDs in combat calculations.

## 13. Bait must matter

Bait affects encounter preparation and optionally combat.

Examples:

Worm:
- attracts small/common fish
- mild opening advantage

Frog Lure:
- attracts snakehead/predators
- may reveal first aggressive action

Special King Lure:
- attracts large predators
- improves a specific tactical check

Avoid using generic rare chance bonuses as the only design.

## 14. Encounter length

Target pacing:
- Common: 1–3 meaningful turns
- Uncommon: 2–4
- Rare: 3–6
- Elite: 4–8
- King: ~6–12

If player gear vastly exceeds a common fish, allow quick/accelerated catch resolution.

Do not make farming repetitive.

## 15. King Fish boss

The Village Canal King Fish remains:

**Moon Shadow Snakehead / พญาช่อนเงาจันทร์**

It must be a real boss, not a normal fish with inflated stats.

Suggested phases:

### Phase 1
Teach/read:
- Fake Dash
- Deep Dive
- Heavy Pull

### Phase 2 — Moon Frenzy
Around 60% stamina:
- more aggressive pattern
- increased speed/pressure
- some intents harder to read but still fair

### Phase 3 — Desperate Run
At low stamina:
- fish tries to escape toward deep water
- distance becomes the climax
- player must balance REEL/PULL/BRACE/RELEASE

Victory should feel earned through knowledge, preparation, and decisions.

## 16. Prototype scope

Do not rebuild all Chapter 1 content immediately.

First validate combat with only:
- 1 beginner fish
- 1 intermediate fish
- Moon Shadow Snakehead

Starter gear:
- 2 rods
- 2 reels
- minimal line/hook variants if required
- 3 bait options

Actions:
- REEL
- PULL
- RELEASE
- BRACE
- OBSERVE

The milestone question is:

**IS THIS FISHING COMBAT FUN?**

Do not mass-produce content before answering this.

## 17. Visual rework

Move away from:
- generic web UI
- dashboard cards
- application layouts
- meter-first composition
- form-heavy presentation

Target:

**ILLUSTRATED ADVENTURE RPG + FISHING DUEL**

Composition priorities:
- large environment scene
- strong fish presentation
- angler/rod presence
- integrated HUD
- highly readable fish intent
- action area
- tension/distance visualization
- fast check/dice feedback

The screen must feel like a game, not admin software.

## 18. Art strategy

Do not depend on complex realtime full-character animation.

Prefer:
high-quality key art
+ layered motion
+ parallax
+ water movement
+ camera pans/zoom
+ splash
+ screen shake
+ line motion
+ particles
+ lighting
+ impact frames
+ animated typography

A beautiful mostly-static illustration with strong motion treatment is better than low-quality full animation.

Do not block mechanics on final art.

## 19. Dice/check presentation

Keep checks exciting but fast.

Show enough to understand:
roll + modifiers = result

Critical results can use:
- impact
- shake
- strong audio
- short typography

Do not make every action wait on a long dice animation.

## 20. Information priority

During combat the player must immediately understand:

1. What will the fish do?
2. How much AP remains?
3. What actions are available?
4. Current tension?
5. Current distance?
6. Fish stamina?
7. Why did the previous action succeed/fail?

Everything else is secondary.

## 21. Responsive web game

Desktop-first, but usable on mobile.

Do not create different game rules per device.

Keep major controls touch-friendly and primary combat information visible.

## 22. Combat event model

Game logic emits semantic events, for example:
- PLAYER_ACTION_SELECTED
- CHECK_ROLLED
- PLAYER_ACTION_RESOLVED
- FISH_INTENT_REVEALED
- FISH_ACTION_RESOLVED
- TENSION_CHANGED
- DISTANCE_CHANGED
- FISH_STAGGERED
- LINE_DAMAGED
- CRITICAL_SUCCESS
- FISH_CAUGHT
- FISH_ESCAPED

Rendering listens to events.

Core rules must not directly invoke Pixi animations.

Maintain:

CONTENT
→ GAME CORE
→ SEMANTIC EVENTS
→ PRESENTATION

## 23. Architecture direction

Adapt to the repository rather than blindly creating files.

Suggested combat modules:

src/game/core/fishing/
- fishing-session.ts
- fishing-state.ts
- turn-engine.ts
- action-system.ts
- fish-ai.ts
- fish-intent.ts
- tension-system.ts
- distance-system.ts
- stamina-system.ts
- skill-check.ts
- advantage.ts
- status-system.ts
- combat-events.ts
- combat-result.ts

Prefer small modules and pure functions.

Do not create unnecessary classes.

## 24. Content model

Fish content should describe behavior through configuration/registries, conceptually:

{
  id,
  tier,
  rarity,
  stats,
  behaviors,
  phases,
  weaknesses,
  preferredBait,
  knowledge
}

Content files must not execute arbitrary gameplay code.

## 25. Debug tooling

Provide lightweight dev controls:
- choose fish
- force King Fish
- set RNG seed
- set stamina
- set distance
- set tension
- equip gear
- force fish intent
- restart encounter
- speed presentation

Keep dev-only behavior isolated from production.

## 26. Tests

Cover at least:
- turn transitions
- AP consumption
- action validation
- tension changes
- distance changes
- stamina calculations
- advantage/disadvantage
- partial success
- critical success/failure
- fish AI intent selection
- boss phase transitions
- fish escape
- line break
- catch victory
- seeded RNG
- equipment modifiers
- knowledge unlocking

Tests target rules, not animation implementation.

## 27. Balance simulation

Where practical, add a lightweight development simulator to detect:
- impossible encounters
- encounters that always win
- excessive RNG dependence
- overlong boss fights
- dominant gear/action combinations

It does not need perfect balance.

## 28. Old realtime mechanic cleanup

Identify and remove/isolate obsolete systems such as:
- continuous reel input
- frame-driven tension rules
- realtime fish struggle loop
- old HUD coupling

Do not leave two competing combat architectures active.

Reuse code only where it still fits the new model.

## 29. Preserve the story

Do not change the Chapter 1 premise:

Child dreams of becoming the world's greatest angler.
Starts at Village Canal.
Learns local fish.
Builds gear.
Hears the legend.
Prepares.
Challenges the King Fish.
Catches Moon Shadow Snakehead.
Gets noticed by a scout.
Next adventure opens.

## 30. Out of scope

Do NOT implement yet:
- realtime multiplayer
- PvP
- tournament system
- breeding
- advanced aquarium
- large crafting
- gacha
- guild
- premium currency
- full Chapter 2
- dozens of new fish
- mass AI art generation

Combat validation comes first.

## 31. Implementation phases

### Phase A — Audit
Inspect repository.
Produce KEEP / REFACTOR / REPLACE / REMOVE.
Proceed immediately.

### Phase B — Combat Model
Implement:
- turn loop
- AP
- tension
- distance
- stamina
- core actions
- fish intent
- seeded resolution

Tests must pass.

### Phase C — Three-Fish Prototype
Implement:
- beginner fish
- intermediate fish
- Moon Shadow Snakehead

Verify distinct play patterns.

### Phase D — Gear Interaction
Add 2 rods, 2 reels, 3 bait and ensure builds change decisions.

### Phase E — Knowledge / Observe
Implement OBSERVE and encyclopedia knowledge integration.

### Phase F — Boss
Implement Moon Shadow Snakehead phases and climax.

### Phase G — Presentation
Rework combat scene into illustrated fishing duel with:
- intent presentation
- impact feedback
- fast check/dice feedback
- water effects
- camera movement
- responsive action UI

### Phase H — Gameplay Review
Repeatedly evaluate:
- meaningful decision each turn?
- mistakes understandable?
- fish knowledge useful?
- gear changes strategy?
- RNG supports rather than dominates?
- common encounters fast enough?
- King Fish feels like boss?

If any answer is NO, improve mechanics before adding content.

## 32. Quality bar

The rework is not complete merely because turns, buttons, and dice work.

Every action needs:
- purpose
- benefit
- risk
- counter-context

Detect and eliminate dominant loops such as:
- PULL every turn
- REEL every turn

If repeated single-action play reliably wins, combat design is not complete.

## 33. Definition of done

This milestone is complete when:

1. Old realtime fishing is no longer the primary loop.
2. Fishing uses explicit turns.
3. Player has limited AP.
4. Fish telegraph meaningful intents.
5. REEL/PULL/RELEASE/BRACE/OBSERVE are implemented.
6. Tension matters.
7. Distance matters.
8. Fish stamina matters.
9. Equipment changes decisions.
10. Fish behaviors differ.
11. Checks support partial/critical outcomes.
12. Advantage/disadvantage is understandable.
13. RNG is seeded/testable.
14. Beginner fish is easy but interactive.
15. Intermediate fish requires adaptation.
16. Moon Shadow Snakehead feels like a boss.
17. Boss escalates through phases/equivalent behavior.
18. Player can explain why they won/lost.
19. Collection records useful fish knowledge.
20. Combat UI does not resemble a dashboard.
21. Important actions have satisfying feedback.
22. Desktop gameplay feels smooth.
23. Mobile remains usable.
24. Relevant tests pass.
25. Production build succeeds.

## 34. Repository quality gate

Before requesting review / merge, run:

```bash
npm run check
```

This repository defines that as the required gate: content validation, Vitest tests, TypeScript, and production build.

Also manually inspect:
- desktop combat
- ~390px mobile combat
- browser console
- save/reload when affected

## 35. Working instruction

Do not stop at analysis.

Inspect.
Plan briefly.
Implement.
Test.
Play through.
Identify weak interactions.
Improve them.
Verify again.

Use small coherent patches.
Preserve good existing work.
Replace the old realtime gameplay decisively where needed.

**Optimize for one encounter that is actually fun, not for content quantity.**

A three-fish prototype with excellent combat is more valuable than fifty fish using a weak system.

If Moon Shadow Snakehead is not enjoyable to replay, do not expand the collection. Fix the core first.
