# Client state (Zustand)

Server data does not live here. Pages load it in server components through
`@/lib/api/server`, and the backend is the source of truth. A store holds
client-only UI state that several unrelated components share.

Rules:

- One store per concern, one file per store: `src/stores/<name>-store.ts`,
  exporting `use<Name>Store` plus narrow selector hooks (`useExamActive`).
- Components read through a selector so they re-render only on the slice they
  use: `useExamStore((s) => s.active)`, never `useExamStore()`.
- Stores are module singletons. On the server that singleton is shared by every
  request, so never write to a store during render or in a server component.
  Write only from event handlers and effects.
- Persisting to `localStorage`: use Zustand's `persist` middleware with a
  `createJSONStorage(() => localStorage)` storage and `skipHydration: true`,
  then call `useXStore.persist.rehydrate()` in an effect. This keeps the server
  HTML and the first client render identical.
- Local state (`useState`) stays local. Reach for a store only when two
  components that don't share a parent need the same value.
