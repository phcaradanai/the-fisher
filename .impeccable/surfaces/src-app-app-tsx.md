---
version: 1
slug: "src-app-app-tsx"
primary_target: "src/app/App.tsx"
related_targets: []
---

# Village Canal gameplay surface

## Scope and visitor mode
Web, Experience. First playable Chapter 1 surface; open directly at the Village Canal's Shallow Bank, ready to cast. The player should read the water, fish state, and next action without leaving the live scene.

## Audience, job, action, content, constraints
Players explore four canal spots, catch and collect fish, equip starter gear, and progress toward the local King Fish. First action: cast. The prompt pins a peaceful village canal, Thai/English content structure, interactive fishing combat, React for semantic UI, PixiJS for continuous gameplay, no backend, and Chapter 1 only. No final artwork is available; authored game graphics must remain replaceable.

## Direction contract

THESIS: The float is not decoration; its changing depth tells the story of every fight. Refuse a conventional meter-first game HUD that could describe any fishing game.

OWN-WORLD: Saturated canal teal owns the main field, with sunlit reed ochre, signal-coral floats, and a clear mint state accent. Use painted cork, visible monofilament, and living canal water as materials. Location marks and numerals borrow the crisp, practical language of tackle gauges; body copy stays open and highly legible. Keep one waterline topology across fishing, collection, gear, and story. State is encoded through position, shape, words, and numbers—not color alone. Motion belongs to cast arcs, float movement, ripples, rod bend, and short catch reveals; honor reduced motion.

STORY: The player arrives at Shallow Bank already able to cast, sees a local King Fish rumor and a clear Chapter 1 path, learns to read bites and tension, and earns access to the deeper spots through play.

FIRST VIEWPORT: At desktop, the live canal occupies roughly two-thirds of the first screen. Put Village Canal / Shallow Bank and chapter progress along the top edge; keep the float, line, fish movement, and a short local-legend note over the scene; place explicit tension and stamina values at the waterline; anchor CAST and later REEL / PULL / RELEASE actions in a high-contrast dock. At 390px, keep the full-width scene first, stack spot and state labels without occlusion, and put thumb-reachable actions immediately below it. The first screen must show the active game, not a title hero or dashboard.

FORM: Floatline Signals, assigned candidate 6 of 7; seed da86aa28. The user selected this direction and confirmed the opening flow “Canal ready to fish.” Signature interaction: cast into the scene, watch the float submerge on a bite, time HOOK, then manage tension by changing REEL / PULL / RELEASE; numeric and text cues supplement the physical signal. A rare catch reveals as wake, fish, then collection record.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
