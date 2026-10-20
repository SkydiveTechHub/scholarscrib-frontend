/**
 * Where Tab should land to keep focus inside a modal dialog, or null to let the
 * browser move focus normally. `nodes` are the dialog's focusable elements in
 * order; `container` is the dialog itself, which holds focus on open.
 */
export function trapTarget<T>(
  nodes: T[],
  active: unknown,
  container: unknown,
  shift: boolean,
): T | null {
  if (nodes.length === 0) return null;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];

  // Focus is on the dialog itself, or has escaped it: bring it in.
  if (active === container || !nodes.includes(active as T)) {
    return shift ? last : first;
  }
  if (shift && active === first) return last;
  if (!shift && active === last) return first;
  return null;
}
