# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## How to run

No build step. Open `index.html` in a browser to play. To check JS syntax:

```bash
node --check game.js
```

## Architecture

Single-file vanilla JS shoot-em-up. Three files:

- `index.html` — DOM structure (HUD, menus, canvas)
- `style.css` — visual styling
- `game.js` — all game logic (~2150 lines)

**Game loop**: `requestAnimationFrame` drives `update()` then `draw()` each frame. `update()` processes: stars → player → bullets → enemies → powerups → waves → boss warning → boss → particles → explosions → floating texts → screen effects. `draw()` renders in z-order: background → powerups → enemies → boss → bullets → particles → explosions → player → floating texts → UI overlays.

**State machine**: `gameState` is `menu | playing | paused | gameover`. All mutable state (player, bullets, enemies, boss, wave counters, score) are module-scoped globals initialized in `initGame()`.

**Wave system** (`updateWaves`, line ~1806): Alternating enemy waves and boss fights. Normal waves spawn enemies from a pool that expands with wave number (small→fast→medium→bomber). Every 2nd wave triggers `startBossFight()` → 3s warning timer → `createBoss()`.

**Boss system** (`BOSS_DEFS`, line ~708): 4 typed bosses unlocked at wave thresholds. Each has a config object defining HP scaling, movement, attack patterns, colors, and multi-phase behavior. Boss dispatch uses if-else chains in `updateBossMovement()`, `updateBoss()`, and `drawBoss()`.

**Enemy types** (`ENEMY_DEFS`, line ~700): small, fast, medium, bomber. Movement and firing behavior dispatched in `updateEnemies()`.

**Collision**: Circle-rect for bullets-vs-entities, rect-rect for player-vs-enemies. Player-boss bullet collision handled in `updateBullets()` (not `updateBoss()`).

**Difficulty**: `difficulty = 1 + (wave - 1) * 0.15` — affects enemy downward speed only. Spawn rate, enemy count, boss HP/score scale directly with `wave`. Boss bullet speed/density have their own wave-dependent helpers (`getBossBulletSpeed`, `getBossDensity`).

**Power-ups** (`POWERUP_TYPES`): SPREAD, LASER, MISSILE, SHIELD, HEALTH. Weapon stacking: two of same type upgrades to HYBRID. SHIELD absorbs one hit. Power-ups drop from enemies (15% + bonus for bombers) and boss kills (3 guaranteed).
