# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

TypeScript, React, Vite, PixiJS, Zustand, local browser persistence (IndexedDB or LocalStorage), and Vitest; use Playwright for critical flows only. The user confirmed this stack from `prompt/#001.md`. Package manager and deployment target are unspecified.

## Users

Players of a browser-based fishing collection RPG. Their core activity is progressing through fishing spots, catching and collecting fish, improving equipment, and completing the starter chapter. The protagonist is a child angler; player age and demographic are not specified.

## Product Purpose

Deliver a small, playable fishing collection RPG about an aspiring angler. Success for the first chapter means exploring the Village Canal, catching its local King Fish through interactive gameplay, and receiving the scout's invitation to travel onward.

## Positioning

The intended experience combines collection and progression, fishing combat, boss hunting, equipment builds, and light narrative. Fish fights require player decisions; gear score alone must not resolve catches automatically. This is a focused chapter-based game, not a realistic simulator, open-world game, or full MMORPG.

## Operating Context

The first chapter takes place at the Village Canal, with four distinct fishing spots and a local King Fish encounter. Players catch and sell fish, acquire and equip starter gear and bait, discover fish in a collection, and advance story events. The specification calls for Thai and English content structure. Progress is stored locally in the browser and must survive reloads.

## Capabilities and Constraints

- Chapter 1 only: Village Canal through the King Fish and scout invitation; do not build later locations or multiplayer systems yet.
- Separate content, game logic, and rendering. Fish, gear, areas, and story should be data-driven and accessed through registries rather than hardcoded into UI or rendering.
- React owns menus and semantic UI; PixiJS owns continuously moving gameplay. Keep per-frame gameplay values out of React state.
- Fishing rules should be explicit, testable, and reproducible using centralized seeded randomness.
- Use a versioned local save format. No backend or account system is required for this milestone.
- Validate content during development, including IDs, required fields, and references.
- Player age, package manager, and deployment target remain unspecified.

## Evidence on Hand

`prompt/#001.md` is the product and technical specification. No application, user research, shipped product, final art, or deployment configuration is present yet; do not invent proof points or brand claims.

## Product Principles

- Build a small, genuinely playable game rather than an architecture demo.
- Keep the first release focused on the Village Canal chapter.
- Keep content independent from simulation rules and rendering.
- Make fishing decisions, outcomes, and failures understandable to the player.
- Prioritize deterministic gameplay, valid content, and persistent progress.
