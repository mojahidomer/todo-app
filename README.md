# ToDo App Board

A drag-and-drop task management board built with React 19 and TypeScript. Tasks move across three status columns — **Todo**, **In Progress**, and **Done** — with real-time simulation, optimistic updates, undo/redo history, and full mobile support.

## Features

- **Drag & drop** between columns via `@dnd-kit` with a ghost overlay during drag
- **Optimistic updates** — UI moves instantly, rolls back automatically on API failure
- **WebSocket simulation** — a fake WebSocket fires random task updates every 8–12 seconds; mid-drag conflicts are queued and applied after the drop settles
- **Undo / Redo** — up to 50 history entries; Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts; external (WebSocket) updates never pollute the undo stack
- **Filtering** — search by title/description, filter by assignee and priority (AND logic)
- **Virtualised columns** — `@tanstack/react-virtual` renders only visible cards; handles 1000+ tasks without jank
- **Toast notifications** — bottom-right stack, max 3 visible, auto-dismiss after 4 seconds
- **Conflict detection** — editing a task that gets updated in the background shows an inline banner with "Use latest / Keep my changes" options
- **Mobile responsive** — snap-scroll columns on phones, adaptive filter bar and undo/redo bar

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 (functional components + hooks) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Virtualisation | `@tanstack/react-virtual` |
| Forms | `react-hook-form` |
| State | Context API + `useReducer` |
| Build | Vite |
| Tests | Vitest + Testing Library |

## Getting Started

```bash
npm install
npm run dev       # http://localhost:5173
```

```bash
npm run build     # production build → dist/
npm run lint      # ESLint + TypeScript check
npm test          # Vitest (unit + integration)
```

## Project Structure

```
src/
├── api/
│   ├── taskApi.ts              # Fake async API — 2s delay, 10% random failure
│   └── dataChannel.ts          # Fake WebSocket — fires every 8–12s
├── components/
│   ├── Board.tsx               # Root orchestrator — DnD context, layout
│   ├── Column.tsx              # Virtualised column with drop zone
│   ├── TaskCard.tsx            # Draggable card — priority/status badges, edit/delete
│   ├── TaskForm.tsx            # Create / edit modal — focus trap, Escape to close
│   ├── FilterBar.tsx           # Search + assignee + priority filters
│   ├── UndoRedoBar.tsx         # Undo/Redo buttons with action label
│   ├── ToastContainer.tsx      # Notification stack (bottom-right)
│   ├── ConflictBanner.tsx      # In-form banner for background task mutations
│   └── ErrorBoundary.tsx       # Per-column crash boundary
├── context/
│   └── TaskContext.tsx         # Global state — reducer + optimistic actions
├── hooks/
│   ├── useTasks.ts             # Re-exports useTaskContext (convention boundary)
│   ├── useBoardDrag.ts         # Drag sensors + start/end handlers
│   ├── useFilters.ts           # Filter state + applyFilters logic
│   ├── useToasts.ts            # Toast queue — max 3, 4s auto-dismiss
│   ├── useDataSync.ts          # WebSocket listener — conflict queueing
│   ├── useUndoRedo.ts          # Exposes canUndo/canRedo + labels from context
│   └── useKeyboardShortcuts.ts # Ctrl+Z / Ctrl+Shift+Z
├── data/
│   └── mockTasks.ts            # Seed data (1000 tasks for virtualisation demo)
└── types/
    └── task.ts                 # Task, Status, Priority, Toast, HistoryState, …
```

## Key Concepts

### Optimistic Updates + Rollback
Dragging a card dispatches `MOVE_TASK` immediately (no wait). The fake API resolves after 2 seconds. On success, `RECORD_MOVE` writes to undo history. On failure, a second `MOVE_TASK` restores the previous status and an error toast appears.

### WebSocket Conflict Handling
`useDataSync` passes `activeTask.id` to the WebSocket listener. If an external update arrives for the card currently being dragged, it is queued — not applied — until the drag completes. On drop, queued updates are flushed with deduplication (last write per task ID wins).

### Undo/Redo History
History lives in `TaskContext` reducer state as `{ past, present, future }` stacks (max 50 entries). Only user-initiated actions (`ADD_TASK`, `UPDATE_TASK`, `DELETE_TASK`, confirmed moves) push to history. Optimistic moves, rollbacks, and WebSocket updates never appear in the undo stack.

### Race Condition Prevention
`taskApi.ts` maintains an `inFlightTimestamps` map. If a second drag fires for the same task before the first API call settles, the first call detects it was superseded and returns `'superseded'` without dispatching `RECORD_MOVE`.
