# RCube Web - Architecture

A 3D Rubik's cube simulator built with React, TypeScript, and Three.js
(via React Three Fiber). It supports any N×N×N size with smooth, queued move
animations.

The codebase is organized into four layers with strict, one-directional
dependencies:

```
cube/    pure cube logic (no React, no Three.js)
  ▲
render/  Three.js / R3F components that render a VisualCubieState
  ▲
app/     React controller hook that owns state and the animation queue
  ▲
App.tsx  wires the controller to the renderer and the control panel
```

Solver algorithms are intentionally **not** part of the current codebase. The
`cube/` module is designed so solvers can be layered on top later without
touching the renderer or UI.

---

## 1. `cube/` — Framework-agnostic logic

This module contains no React or Three.js imports. It is the source of truth for
cube state and moves and is fully unit-tested (`cube.test.ts`).

### Models

There are three state representations, each with a clear role:

| Representation     | File                  | Purpose                                   |
| ------------------ | --------------------- | ----------------------------------------- |
| `CubeState3x3`     | `model/state-3x3.ts`  | Canonical CP/CO/EP/EO 3×3 state (solver-ready) |
| `GridCubeState`    | `model/state-grid.ts` | General N×N sticker grid for any size     |
| `VisualCubieState` | `model/state-visual.ts` | Flat, render-facing cubie list          |

- **`CubeState3x3`** stores corner permutation/orientation (CP/CO) and edge
  permutation/orientation (EP/EO). This compact form is what future solvers will
  operate on, and it powers O(1) precomputed move tables.
- **`GridCubeState`** models each visible sticker by position, which scales to
  any size at the cost of the compact invariants the 3×3 form provides.
- **`VisualCubieState`** is the only thing the renderer consumes: a list of
  `VisualCubie` objects, each with a stable `id`, a current `gridPosition`, and
  the `stickerColors` shown on its faces.

### `CubeModel` facade

`model/cube-model.ts` exposes a single immutable interface used by the rest of
the app:

```ts
interface CubeModel {
  readonly size: number;
  isSolved(): boolean;
  applyMove(move: Move): CubeModel;
  applySequence(moves: Move[]): CubeModel;
  toVisual(): VisualCubieState;
  readonly canonicalState: CubeState3x3 | null; // 3×3 only
}
```

`createCubeModel(size)` returns the canonical 3×3 model for size 3 and the grid
model otherwise. Every operation returns a new model, so React can rely on
reference changes.

### Moves

- `moves/notation.ts` parses/formats notation (`R`, `R'`, `R2`, `2L`, …) into a
  `Move { face, layer, amount }`, where `amount` is the number of clockwise
  quarter turns (1, 2, or 3).
- `moves/tables-3x3.ts` holds precomputed permutation/orientation tables so a
  3×3 move is an O(1) array remap.
- `moves/apply.ts` applies a `Move` (or sequence) to a `CubeState3x3`.

### Conversion & validation

- `convert/facelets.ts` — `CubeState3x3` ↔ 54-facelet array (for future solver
  I/O and standard cube strings).
- `convert/visual.ts` — `CubeState3x3` → `VisualCubieState`.
- `validate/solved.ts` — `isSolved`, `isValidState` (parity checks).
- `validate/hash.ts` — `hashState` / `hashEdges` fast hashing primitives kept
  for future solver use.

---

## 2. `render/` — Three.js rendering

The renderer is a pure function of `VisualCubieState` plus an optional
animation descriptor. It never imports the logical models directly.

### Shared resources (`materials.ts`)

Geometries and materials are module-level singletons, created once and reused by
every cubie, so an N×N cube allocates a constant number of GPU resources:

- one shared `BoxGeometry` for cubie bodies,
- one shared `PlaneGeometry` for stickers,
- one shared dark body material,
- one cached `MeshLambertMaterial` per sticker color.

### `CubiePiece`

A memoized component that renders one cubie: the shared body plus a colored
sticker plane for each visible face. `React.memo` compares grid position and
sticker colors so cubies only re-render when their derived data actually
changes.

### `RubiksCube` + `useFrame` animation

`components/rubiks-cube.tsx` splits cubies into two groups:

- **static** cubies render directly, and
- **affected** cubies (the rotating layer) render under a pivot `group`.

The active layer rotation is driven entirely by `useFrame` mutating the pivot's
`rotation` via a ref — **no React state changes per frame**. The component only
re-renders when the committed `visual` changes, i.e. once per completed move.

An `AnimationDescriptor` (`render/animation.ts`) carries everything the frame
loop needs: a monotonically increasing `moveId` (a change resets the pivot), the
set of affected cubie ids, the rotation `axis`, signed `angle`, and duration.
When a rotation reaches 100%, the component calls `onAnimationComplete` exactly
once (guarded by `completedMoveRef`).

The old approach of remounting the whole cube via a `cubeVersion` key has been
removed.

---

## 3. `app/` — Controller

`app/hooks/use-cube-controller.ts` owns all mutable state and the move queue:

- the `CubeModel` (in a ref) and its derived `VisualCubieState` (in state),
- a FIFO move queue and the currently animating move,
- the `AnimationDescriptor` exposed to the renderer.

Flow of a move:

1. `executeMove`/`executeMoves` parse notation into `Move`s and enqueue them. If
   idle, the controller starts the next move.
2. Starting a move computes its `MoveGeometry` (`getMoveGeometry`) and the set of
   affected cubie ids, then publishes a new `AnimationDescriptor`.
3. The renderer animates the pivot and calls `onAnimationComplete`.
4. The controller commits the move to the model (`applyMove`), derives the new
   `VisualCubieState`, and starts the next queued move (or goes idle).

Because the logical move is committed only when its animation finishes, the
visible state and the model never diverge. `scramble`, `reset`, `stop`, and
`setSize` manipulate the same queue/model.

---

## 4. `App.tsx` and UI

`App.tsx` instantiates the controller and passes `visual`, `animation`, and
`onAnimationComplete` to `RubiksCube`, and the command callbacks to
`CubeControls`. Heavy 3D modules (`Canvas`, `OrbitControls`, `RubiksCube`) and
the control panel are lazy-loaded.

`components/cube-controls.tsx` is pure presentation: face buttons, a custom
sequence input, scramble length, reset/stop, and a cube-size selector. It holds
no cube logic. `components/face-orientation-hud.tsx` reads camera orientation
each frame to label the currently visible faces.

---

## Complexity notes

| Operation                  | Cost                                     |
| -------------------------- | ---------------------------------------- |
| 3×3 `applyMove`            | O(1) via precomputed tables              |
| N×N `applyMove`            | O(n²) sticker remap                      |
| `toVisual`                 | O(n²) visible cubies                     |
| Per animation frame        | O(1) ref mutation (no React re-render)   |
| React re-render per move   | once, on commit                          |

This separation keeps the renderer dumb, the logic testable, and leaves a clean
seam for adding solver algorithms against `CubeModel` / `CubeState3x3` later.
