# King Fisher — Moonlit Canal

The Chapter 1 game follows the supplied fantasy-fishing reference as a visual direction: a moonlit canal behind the playable interface, deep navy panels, luminous blue actions, warm gold highlights, and compact equipment readouts. Every image used by this theme is newly generated artwork, not a crop of the supplied reference. The actual PixiJS canal remains the live fishing scene.

## Tokens and composition

- `src/app/fantasy-canal.css` defines the active dark palette and overrides the shared component tokens in `styles.css`.
- Background: `public/theme_games/moonlit-canal-original.webp`, newly generated for the Village Canal. The original supplied reference remains in `public/theme_games/` but is not rendered. New generated sources (`*-original-atlas.jpg`) and their optimized `.webp` plates supply the brand mark, four spot thumbnails, five equipment pictures, and five tactical-card images.
- Element-based pictograms have been replaced by newly generated asset icons: five tactical actions, cast, four navigation tabs, and equipment thumbnails in the gear catalog. Their source atlases are `action-icons-original-atlas.jpg` and `nav-icons-original-atlas.webp` in `public/theme_games/`.
- Navy panels (`#051323` / `#0a1d31`), pale reading text (`#f2f5fb`), muted blue-gray supporting text (`#b4c5d7`), cyan interaction accents (`#66caff`), and warm gold location/brand accents (`#ffd17c`).
- Header and navigation span the viewport. The location gallery controls the four existing spots; locked spots remain disabled. Fishing keeps the live scene and a spot-information overlay on the left and equipped gear on the right. The five tactical actions retain their existing semantics and controls.
- At 390px, the gallery and navigation scroll horizontally, the scene-information overlay moves below the canvas, and equipment stacks beneath fishing. Thai and English share the same layout.

## Behavior and accessibility

Preserve the existing fishing state machine, spot selection, equipment, bilingual copy, save boundary, keyboard focus, and reduced-motion control. Player actions use text labels as well as color; decorative scenery must not contain gameplay information. The scene is rendered by PixiJS rather than the reference screenshot.
