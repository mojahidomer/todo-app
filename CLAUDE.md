# CLAUDE.md

## Project Overview
A Kanban-style Task Management Board — a drag-and-drop web app where tasks move across three status columns: **Todo**, **In Progress**, and **Done**.

## Tech Stack
- **Frontend:** React (functional components + hooks)
- **Styling:** Tailwind CSS
- **Drag & Drop:** `@dnd-kit/core` + `@dnd-kit/sortable`
- **State Management:** Context API (`TaskContext`) for global task state + `useReducer` for task actions
- **Language:** TypeScript (strict mode) — **all files must use `.tsx` / `.ts` extensions, no `.js` or `.jsx`**

## Key Directories
```
src/
├── components/
│   ├── Board.tsx          ← Main kanban board layout (3 columns)
│   ├── Column.tsx         ← Individual column (Todo / In Progress / Done)
│   ├── TaskCard.tsx       ← Draggable task card UI
│   ├── TaskForm.tsx       ← Create / edit task modal form
│   └── FilterBar.tsx      ← Assignee, priority filters + search input
├── context/
│   └── TaskContext.tsx    ← Global task state via Context API
├── types/
│   └── task.ts            ← Task & Filter interfaces, enums
├── hooks/
│   ├── useTasks.ts        ← Task CRUD logic (uses TaskContext)
│   └── useFilters.ts      ← Filter/search state logic
├── data/
│   └── mockTasks.ts       ← Initial seed data for development
└── App.tsx
```

## Core Data Model

```ts
// src/types/task.ts
export type Status = 'Todo' | 'In Progress' | 'Done';
export type Priority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;       // optional at creation, defaults to 'Medium'
  assignee: string;
  tags: string[];           // optional at creation, defaults to []
  createdDate: string;      // ISO date string, auto-set on creation
}

export interface NewTaskInput {
  title: string;            // required
  description: string;      // required
  assignee: string;         // required
  priority?: Priority;      // optional, defaults to 'Medium'
  tags?: string[];          // optional, defaults to []
}

export interface FilterState {
  assignee: string;         // '' means no filter
  priority: Priority | '';  // '' means no filter
  search: string;           // matches title or description
}
```

## Commands
```bash
npm install                          # Install dependencies
npm run dev                          # Start dev server (Vite)
npm run build                        # Production build
npm run lint                         # ESLint check
npm test                             # Run tests (Vitest)

# New dependencies for Part 2
npm install @tanstack/react-virtual  # Virtualization
```

## Feature Requirements (Part 1)

### Task Card Display
Each `TaskCard` must render:
- `title` — bold, prominent
- `description` — truncated to 2 lines, expandable on click
- `status` — shown as a badge (color-coded)
- `priority` — badge: Low=green, Medium=yellow, High=red
- `assignee` — shown with avatar initials fallback
- `createdDate` — formatted as `MMM DD, YYYY`

### Board Columns
- Exactly **3 columns**: `Todo`, `In Progress`, `Done`
- Each column shows task count in the header
- Columns scroll vertically if tasks overflow

### Drag and Drop
- Tasks are draggable between columns using `@dnd-kit`
- On drop, task `status` updates to match the destination column
- Visual drag overlay while dragging (ghost card)
- Drop zones highlight on hover during drag

## Feature Requirements (Part 2 — Task Creation)

### Modal Behaviour
- Clicking **"+ Add Task"** button (top of board) opens a modal overlay
- Modal closes on: clicking the backdrop, pressing `Escape`, or successful submit
- Modal must trap focus while open (accessibility)
- On submit, the new task is added to the **Todo** column by default

### TaskForm Fields
| Field | Type | Required | Default |
|---|---|---|---|
| `title` | text input | ✅ Yes | — |
| `description` | textarea | ✅ Yes | — |
| `assignee` | text input | ✅ Yes | — |
| `priority` | select (Low / Medium / High) | ❌ Optional | `'Medium'` |
| `tags` | comma-separated text input | ❌ Optional | `[]` |

### Validation Rules
- `title` — required, min 3 characters, max 80 characters
- `description` — required, min 10 characters
- `assignee` — required, non-empty string
- Show inline error messages below each invalid field on submit attempt
- Disable the submit button while validation errors exist

### Tags Display
- Tags split by comma on input, trimmed, lowercased, and de-duplicated
- Render each tag as a small pill badge on the `TaskCard`: `bg-purple-100 text-purple-700`

---

## Feature Requirements (Part 3 — Basic Filtering)

### FilterBar Component
Render above the board with 3 controls:
1. **Search** — text input, filters tasks whose `title` or `description` contains the search string (case-insensitive)
2. **Filter by Assignee** — `<select>` dropdown, options built dynamically from all unique assignees in task list; first option is `"All Assignees"`
3. **Filter by Priority** — `<select>` dropdown with options: `All`, `Low`, `Medium`, `High`

### Filter Logic (in `useFilters` hook)
- All 3 filters are applied simultaneously (AND logic — task must pass all active filters)
- Filtering is done on the **derived/display** task list — never mutate the source tasks array
- Filtered tasks are passed into the Board and distributed into columns by `status`
- If no tasks match, show an empty state message per column: `"No tasks match your filters"`
- **Clear all filters** button appears when any filter is active; resets all to default

### FilterState defaults
```ts
{ assignee: '', priority: '', search: '' }
```

---

## Feature Requirements (Part 4 — Optimistic Updates with Rollback)

### API Simulation Layer (`src/api/taskApi.ts`)
- All task mutations go through a fake async API layer — **never update state directly from components**
- Every API call uses `setTimeout` with a **2-second delay**
- **10% random failure rate**: `Math.random() < 0.1` → reject the promise
- API functions to implement:
  ```ts
  export const apiUpdateStatus = (id: string, status: Status): Promise<Task> => ...
  export const apiAddTask     = (input: NewTaskInput): Promise<Task> => ...
  export const apiDeleteTask  = (id: string): Promise<void> => ...
  ```

### Optimistic Update Flow
1. User drags a task → **immediately update UI** (optimistic state)
2. Simultaneously fire the API call
3. If API **succeeds** → keep the optimistic state (already correct)
4. If API **fails** → **rollback** to previous state + show error toast

### Loading States
- Each task card has an `isUpdating: boolean` flag in state
- While `isUpdating === true`, show a subtle spinner overlay on the card
- Disable drag on cards that are currently updating (`isUpdating === true`)

### Rollback Strategy in Reducer
```ts
// Store previous snapshot before optimistic update
| { type: 'OPTIMISTIC_UPDATE'; payload: { id: string; status: Status; snapshot: Task[] } }
| { type: 'CONFIRM_UPDATE';    payload: { id: string } }
| { type: 'ROLLBACK_UPDATE';   payload: { id: string; snapshot: Task[] } }
```
- `OPTIMISTIC_UPDATE` saves `snapshot` to a `Map<string, Task[]>` in reducer state
- `ROLLBACK_UPDATE` restores from the saved snapshot and clears the entry
- `CONFIRM_UPDATE` just clears the snapshot entry (no state change needed)

---

## Feature Requirements (Part 5 — Real-Time Simulation)

### Simulation Engine (`src/simulation/realtimeSimulator.ts`)
- After app mounts, start an interval that fires every **10–15 seconds** (random: `Math.random() * 5000 + 10000`)
- On each tick, pick a **random existing task** and apply a **random status change**
- Dispatch `EXTERNAL_UPDATE` action to context — this is separate from user-initiated updates
- Stop the simulation on unmount (clear interval in `useEffect` cleanup)

### Toast Notification System (`src/components/ToastContainer.tsx`)
- When an `EXTERNAL_UPDATE` arrives, show a toast: `"[Assignee] moved '[Title]' to [Status]"`
- Toasts appear in the **bottom-right corner**, stack vertically
- Each toast auto-dismisses after **4 seconds**
- Max **3 toasts** visible at once — oldest dismissed first if limit exceeded
- Toast types: `info` (external update), `error` (API failure), `success` (optional)

### Merge Conflict Handling
- If the user is **currently dragging** a task AND a real-time update arrives for the **same task**:
  - Queue the external update — do not apply it immediately
  - After the drag completes (success or rollback), apply the queued update
  - Show toast: `"A conflict was resolved for '[Title]'"`
- Track "in-flight" task IDs in a `Set<string>` in context state

---

## Feature Requirements (Part 6 — Performance Optimization)

### Virtualization (`src/components/VirtualColumn.tsx`)
- Use `@tanstack/react-virtual` (or `react-window`) to virtualize each column's task list
- Only render tasks **visible in the viewport** + overscan of 3
- Each task card has a fixed estimated height of `120px` for virtual sizing
- Virtualization must work with **1000+ tasks** without layout jank

### Memoization Rules
- `TaskCard` wrapped in `React.memo` — re-renders only when its own task data changes
- `Column` wrapped in `React.memo` — re-renders only when its task array reference changes
- `FilterBar` wrapped in `React.memo` — re-renders only when filter state changes
- Filtered + grouped task list computed with `useMemo`:
  ```ts
  const filteredByColumn = useMemo(() =>
    groupTasksByStatus(applyFilters(tasks, filterState)),
    [tasks, filterState]
  );
  ```
- `useCallback` on all event handlers passed as props (drag handlers, filter handlers)
- **Do NOT use `React.memo` on `Board.tsx`** — it receives context and should re-render naturally

### Error Boundaries (`src/components/ErrorBoundary.tsx`)
- Wrap each `Column` in an `ErrorBoundary`
- If a column crashes, show fallback: `"Something went wrong in this column. Refresh to retry."`
- Log errors to `console.error` with task context info
- `ErrorBoundary` is a **class component** (required by React for error boundaries)

### Race Condition Prevention
- Each in-flight API call is associated with a task ID + a **request timestamp**
- If two updates fire for the same task, only the **latest** request's result is applied
- Stale responses (older timestamp) are silently discarded
- Use an `AbortController` pattern or a `requestId` map to track this:
  ```ts
  const pendingRequests = useRef<Map<string, number>>(new Map()); // taskId → timestamp
  ```

### Performance Comments
- Add `// PERF:` comments above every memoization decision explaining **why** it was added
- Add `// RACE:` comments above race condition guards explaining the scenario prevented

---

## Updated Key Directories
```
src/
├── api/
│   └── taskApi.ts             ← Fake async API with delay + 10% failure
├── simulation/
│   └── realtimeSimulator.ts   ← Fires random task updates every 10-15s
├── components/
│   ├── Board.tsx
│   ├── Column.tsx             ← Wrapped in React.memo + ErrorBoundary
│   ├── VirtualColumn.tsx      ← Virtualized column for 1000+ tasks
│   ├── TaskCard.tsx           ← React.memo, isUpdating spinner overlay
│   ├── TaskForm.tsx
│   ├── FilterBar.tsx          ← React.memo
│   ├── ToastContainer.tsx     ← Toast stack, bottom-right
│   ├── UndoRedoBar.tsx        ← Undo/Redo buttons + action description label
│   └── ErrorBoundary.tsx      ← Class component error boundary
├── context/
│   └── TaskContext.tsx        ← Expanded reducer with optimistic + external actions
├── hooks/
│   ├── useTasks.ts
│   ├── useFilters.ts
│   ├── useToast.ts                ← Toast queue management
│   ├── useRealtimeSimulation.ts   ← Starts/stops simulation, handles conflicts
│   ├── useUndoRedo.ts             ← History stack (past/present/future)
│   └── useKeyboardShortcuts.ts   ← Ctrl+Z / Ctrl+Shift+Z / Cmd+Z
├── types/
│   └── task.ts                ← Extended with OptimisticTask, ToastMessage types
└── App.tsx
```

---

## Extended Data Model (Part 2)

```ts
// Additional types for Part 2
export interface OptimisticTask extends Task {
  isUpdating: boolean;        // true while API call in flight
}

export type ToastType = 'info' | 'error' | 'success';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;          // Date.now() timestamp
}

// Extended TaskAction union
type TaskAction =
  | { type: 'ADD_TASK';          payload: NewTaskInput;                            recordHistory: true  }
  | { type: 'UPDATE_STATUS';     payload: { id: string; status: Status };          recordHistory: true  }
  | { type: 'DELETE_TASK';       payload: { id: string };                          recordHistory: true  }
  | { type: 'EDIT_TASK';         payload: Partial<Task> & { id: string };          recordHistory: true  }
  | { type: 'OPTIMISTIC_UPDATE'; payload: { id: string; status: Status; snapshot: Task[] }; recordHistory: false }
  | { type: 'CONFIRM_UPDATE';    payload: { id: string };                          recordHistory: false }
  | { type: 'ROLLBACK_UPDATE';   payload: { id: string; snapshot: Task[] };        recordHistory: false }
  | { type: 'EXTERNAL_UPDATE';   payload: { id: string; status: Status };          recordHistory: false }
  | { type: 'SET_UPDATING';      payload: { id: string; isUpdating: boolean };     recordHistory: false }
  | { type: 'UNDO' }
  | { type: 'REDO' };

// Undo/Redo history state (lives inside TaskContext)
export interface HistoryState {
  past:    Task[][];   // stack of previous snapshots — max 50
  present: Task[];     // current live task list
  future:  Task[][];   // stack of undone snapshots
}

// Action label for UndoRedoBar display
export interface HistoryEntry {
  snapshot: Task[];
  label: string;       // e.g. "Moved 'Fix login bug' to Done"
}
```

---

## Feature Requirements (Part 7 — Undo/Redo System)

### History Stack Rules
- `useUndoRedo` hook wraps the existing `TaskContext` reducer
- History lives in `HistoryState` inside `TaskContext` — not in a separate context
- **Max 50 entries** in `past` stack — when limit is hit, drop the oldest entry (`past.slice(-50)`)
- Actions with `recordHistory: true` push a `HistoryEntry` (snapshot + label) to `past` before applying the change
- Actions with `recordHistory: false` (optimistic, rollback, external) **never** push to history
- `UNDO` action: pop from `past` → push `present` to `future` → restore popped snapshot
- `REDO` action: pop from `future` → push `present` to `past` → restore popped snapshot
- Any new user action (recordHistory: true) **clears the entire `future` stack**

### Action Labels (shown in UndoRedoBar)
Generate a human-readable label for every recordHistory action:
```ts
'ADD_TASK'      → `Added '${title}'`
'UPDATE_STATUS' → `Moved '${title}' to ${status}`
'DELETE_TASK'   → `Deleted '${title}'`
'EDIT_TASK'     → `Edited '${title}'`
```
Labels are stored with each `HistoryEntry` — not recomputed on render.

### `UndoRedoBar` Component
- Renders above the `FilterBar`, below the board header
- Left side: **Undo button** `↩` + label of action that will be undone (from `past[past.length - 1]`)
- Right side: **Redo button** `↪` + label of action that will be redone (from `future[future.length - 1]`)
- Buttons are **disabled** (and visually dimmed) when their respective stack is empty
- Example display:
  ```
  [↩ Undo]  "Moved 'Fix login bug' to Done"      "Added 'Write tests'"  [↪ Redo]
  ```
- Show remaining history count: `"3 / 50 actions"` in the centre (subtle, small text)

### Keyboard Shortcuts (`useKeyboardShortcuts` hook)
```ts
Ctrl+Z      / Cmd+Z       → undo()
Ctrl+Shift+Z / Cmd+Shift+Z → redo()
```
- Listener attached on `window` via `useEffect` — cleaned up on unmount
- Must **not** fire when user is typing inside an input/textarea (check `e.target` tag)
- `useCallback` on `undo` and `redo` to keep handler stable

### Interaction with Optimistic Updates
- When a drag fires `OPTIMISTIC_UPDATE` — **no history entry pushed**
- If API succeeds → `CONFIRM_UPDATE` — **no history entry**; the optimistic state is already correct
- If API fails → `ROLLBACK_UPDATE` — **no history entry**; rollback is automatic, not user-driven
- The net effect: from undo's perspective, a drag that fails never happened

### Edge Cases to Handle
- Undo/redo while a card `isUpdating === true` → **disable undo/redo** until update settles
- Redo stack cleared when a new user action is taken (standard undo/redo behaviour)
- History persists only for the session — no localStorage persistence required

---

Use **Context API + useReducer** pattern:

```ts
// src/context/TaskContext.tsx
type TaskAction =
  | { type: 'ADD_TASK'; payload: NewTaskInput }
  | { type: 'UPDATE_STATUS'; payload: { id: string; status: Status } }
  | { type: 'DELETE_TASK'; payload: { id: string } };

interface TaskContextValue {
  tasks: Task[];
  dispatch: React.Dispatch<TaskAction>;
}
```

- `TaskContext` wraps the entire app in `App.tsx`
- `useTasks` hook consumes `TaskContext` — components never call `useContext(TaskContext)` directly
- `useFilters` is local state in `Board.tsx` — filter state does NOT go into context
- Filtered task list is computed inside `Board.tsx` by calling `useFilters` with the raw `tasks` array

---

## TypeScript Rules
- **Strict mode enabled** — `"strict": true` in `tsconfig.json`, no exceptions
- Every component must have an explicitly typed `Props` interface (e.g. `interface TaskCardProps { ... }`)
- All `useState` calls must be typed: `useState<Task[]>([])` not `useState([])`
- All function return types must be explicit: `const getTaskById = (id: string): Task | undefined => ...`
- Use **type unions** for constrained values — never raw strings: `status: 'Todo' | 'In Progress' | 'Done'` is defined via the `Status` type
- Use `Record<Status, Task[]>` for grouping tasks by column — not a plain object
- Event handlers must be typed: `onChange: (e: React.ChangeEvent<HTMLInputElement>) => void`
- No `@ts-ignore` or `@ts-expect-error` comments without a written explanation above them
- Prefer `type` for unions/primitives, `interface` for object shapes

## Conventions
- All components are **functional** with typed props (no class components)
- Use **named exports** only — no default exports except `App.tsx`
- Prefer `const` arrow functions for components
- All task mutations go through `useTasks` hook — never mutate state directly
- Keep components under 150 lines; extract sub-components if longer
- Use `data-testid` attributes on interactive elements for testability

## Styling Rules
- Use **Tailwind utility classes** only — no custom CSS files
- Priority badge colors:
  - `Low` → `bg-green-100 text-green-700`
  - `Medium` → `bg-yellow-100 text-yellow-700`
  - `High` → `bg-red-100 text-red-700`
- Status badge colors:
  - `Todo` → `bg-gray-100 text-gray-600`
  - `In Progress` → `bg-blue-100 text-blue-700`
  - `Done` → `bg-green-100 text-green-700`
- Column background: `bg-gray-50`, Card background: `bg-white` with `shadow-sm`

## Avoid
- Do **not** use `any` type — use `unknown` and narrow, or define proper interfaces
- Do **not** use implicit `any` (e.g. untyped function params or untyped arrays)
- Do **not** use `.js` or `.jsx` file extensions — everything is `.ts` / `.tsx`
- Do **not** cast with `as` unless narrowing is impossible — prefer type guards instead
- Do **not** manage drag state outside of `@dnd-kit` context
- Do **not** directly mutate the tasks array — always return new arrays
- Do **not** mix status update logic into UI components — keep it in `useTasks`
- Do **not** use inline styles — use Tailwind classes
- Do **not** apply external real-time updates while a drag is in flight — queue them
- Do **not** apply stale API responses — always check request timestamp before applying
- Do **not** wrap `Board.tsx` in `React.memo` — it consumes context and must re-render naturally
- Do **not** run the real-time simulator in test environments — gate it with an env flag
- Do **not** push to undo history for `ROLLBACK_UPDATE`, `OPTIMISTIC_UPDATE`, or `EXTERNAL_UPDATE` — only user-initiated actions get recorded
- Do **not** allow undo/redo while any card has `isUpdating === true`
- Do **not** fire keyboard shortcuts while focus is inside an `<input>` or `<textarea>`

## Warnings
- `@dnd-kit` requires tasks to have **stable, unique string IDs** — use `crypto.randomUUID()` or `uuid` package when creating tasks
- Column drop zones must be wrapped in `<SortableContext>` with correct strategy
- Drag overlay needs `createPortal` to avoid z-index issues inside columns
