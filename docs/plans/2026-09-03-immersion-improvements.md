# MindLoom Immersion Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Implement every remaining B4-D13 immersion feature from `docs/IMMERSION_IMPROVEMENTS_SPEC.md`, with one verified commit per feature.

**Architecture:** Extend the existing Zustand UI store for persisted and session-only preferences, keep orchestration in `App.tsx`, and keep visual/audio behavior inside focused components and utilities. Preserve the current local-only architecture and add no network calls or new dependencies.

**Tech Stack:** React 19, TypeScript 5.7, Zustand 5, Tailwind CSS 4, Web Audio, Tauri 2.

---

## Verification policy

This repository has no automated test runner. Every task therefore uses the specification baseline `npm run build` (TypeScript plus Vite); Rust capability-only changes additionally use `cargo check`. Browser-visible behavior is checked with `npm run dev` and the relevant acceptance checklist. Pure utility functions are kept deterministic with injectable dates/randomness where practical so they remain straightforward to unit-test if a runner is added later.

### Task 1: B4 typewriter caret centering

**Files:**
- Modify: `src/components/Editor.tsx`
- Create: `docs/plans/2026-09-03-immersion-improvements.md`

**Steps:**
1. Add scroll-container and hidden-mirror refs.
2. Implement a requestAnimationFrame-throttled caret measurement using the textarea's live computed typography, width, padding, and border styles.
3. Trigger centering after input, keyup, click, selection, and content changes.
4. Change vertical padding to `pt-[18vh] pb-[50vh]` and keep auto-height behavior.
5. Run `npm run build`; expect exit code 0.
6. Commit `feat: keep the active editor line vertically centered in typewriter mode`.

### Task 2: B5 typing silence

**Files:**
- Modify: `src/store/useUiStore.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/EdgeReveal.tsx`
- Modify: `src/styles/theme.css`

**Steps:**
1. Add non-persisted `typing` state and `setTyping` action.
2. On ordinary global keydown set typing; on mousemove clear it; exclude Escape and modifier shortcuts.
3. Toggle `ml-typing` on `document.body` and clean it up on unmount.
4. Make every edge reveal stay hidden while typing unless forced visible.
5. Run `npm run build`; expect exit code 0.
6. Commit `feat: hide the cursor and edge ui while typing, restore them on mouse move`.

### Task 3: B6 candle theme

**Files:**
- Modify: `src/store/useUiStore.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/BottomDock.tsx`
- Modify: `src/styles/theme.css`
- Modify: `README.md`

**Steps:**
1. Add normalized, persisted `theme: "mist" | "candle"` settings and setter.
2. Apply the theme via `document.documentElement.dataset.theme`.
3. Add cold-mist/candle controls to the Dock.
4. Add candle token overrides for background, foreground, accent, hairlines, and selection.
5. Document the theme feature.
6. Run `npm run build`; expect exit code 0.
7. Commit `feat: add a persisted warm candlelight theme`.

### Task 4: B7 fullscreen and typography controls

**Files:**
- Modify: `src/store/useUiStore.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/Editor.tsx`
- Modify: `src/components/BottomDock.tsx`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `README.md`

**Steps:**
1. Add normalized, persisted font-size and line-width settings with setters.
2. Map sizes to 16/18/20px and widths to 560/640/760px in the editor.
3. Implement Tauri and browser fullscreen helpers; F11 toggles and Escape exits fullscreen before toggling forced UI.
4. Add typography controls to the Dock and required Tauri permissions.
5. Document F11 and typography preferences.
6. Run `npm run build` and `cargo check`; expect both to exit 0.
7. Commit `feat: add fullscreen toggle and persisted editor typography controls`.

### Task 5: C8 goodnight ritual

**Files:**
- Create: `src/components/NightRitual.tsx`
- Create: `src/utils/streak.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/BottomDock.tsx`
- Modify: `README.md`

**Steps:**
1. Implement local-day character totals and consecutive-day streak calculation.
2. Build the timed full-screen ritual overlay.
3. Centralize ritual orchestration in App: flush, show for about 4.5 seconds, hide Tauri window, then reset.
4. Trigger it from Ctrl/Cmd+Enter and a Dock button while preventing re-entry.
5. Document the shortcut and ritual.
6. Run `npm run build`; expect exit code 0.
7. Commit `feat: add a goodnight ritual with tonight character count and streak`.

### Task 6: C9 time-aware prompts

**Files:**
- Create: `src/utils/prompts.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/Editor.tsx`

**Steps:**
1. Add four time-window greeting pools and at least six editor prompts with safe random selection.
2. Pick the launch greeting once per app mount.
3. Pick a placeholder once per blank draft by keying it to the current entry/draft transition.
4. Run `npm run build`; expect exit code 0.
5. Commit `feat: add time-aware greetings and rotating editor prompts`.

### Task 7: C10 ambient sleep timer

**Files:**
- Modify: `src/store/useUiStore.ts`
- Modify: `src/audio/AmbientPlayer.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/BottomDock.tsx`

**Steps:**
1. Add non-persisted timer duration/end state and explicit start/cancel actions.
2. Add master-gain fade-to-silence without mutating the user's target volume.
3. Schedule final-minute fade and expiry cleanup in App with complete timeout cleanup.
4. Cancel the timer on manual ambient changes while allowing expiry to stop audio.
5. Add 15/30 minute buttons and a 30-second remaining-time refresh.
6. Run `npm run build`; expect exit code 0.
7. Commit `feat: add an ambient sleep timer with a final-minute fade out`.

### Task 8: D11 scene presets

**Files:**
- Modify: `src/store/useUiStore.ts`
- Modify: `src/components/BottomDock.tsx`

**Steps:**
1. Export four typed background/ambient presets and an atomic `applyPreset` action.
2. Add the Scene group first in the Dock and show active state only for an exact pair match.
3. Ensure applying a preset participates in ambient timer cancellation as a user change.
4. Run `npm run build`; expect exit code 0.
5. Commit `feat: add one-click scene presets for coordinated visuals and audio`.

### Task 9: D12 breath-synchronized bowl

**Files:**
- Modify: `src/audio/AmbientPlayer.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/backgrounds/BreathRing.tsx`

**Steps:**
1. Add bowl sync mode, public validated strike method, and interval lifecycle helpers.
2. Toggle sync mode from the selected background.
3. Strike at each inhale boundary and display a per-phase whole-second countdown.
4. Verify leaving the breath background restarts the regular 14-second schedule.
5. Run `npm run build`; expect exit code 0.
6. Commit `feat: synchronize bowl strikes with inhale phases and show a countdown`.

### Task 10: D13 reduced motion, search, and export naming

**Files:**
- Modify: `src/components/backgrounds/useCanvasFrame.ts`
- Modify: `src/components/SideEntries.tsx`
- Modify: `src/utils/exporter.ts`
- Modify: `src/components/BottomDock.tsx`
- Modify: `README.md`
- Modify: `docs/IMMERSION_IMPROVEMENTS_SPEC.md`

**Steps:**
1. Watch `prefers-reduced-motion` and draw exactly one current frame while reduced motion is active.
2. Add an accessible controlled search box and case-insensitive content filtering with an empty-result state.
3. Rename the Markdown export API and Dock label/title to state that it exports all notes from today.
4. Update README for all completed user-visible features.
5. Add the ten final commit hashes to the specification completion table after feature commits exist; amend only Task 10 so there remains one commit per feature.
6. Run `npm run build`, `cargo check`, and a browser smoke check; expect successful startup and no console/build errors.
7. Commit `feat: respect reduced motion, add note search, clarify today markdown export`.

