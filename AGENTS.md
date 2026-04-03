[You Might Not Need `useEffect`](mdc:https:/react.dev/learn/you-might-not-need-an-effect)

Prefer alternatives to `useEffect` when possible:

- ref callbacks
- event handlers, including `flushSync` when needed
- CSS
- `useSyncExternalStore`
- derived state during render

`useEffect` is not banned, but it should usually be the last option, not the
first. Use it when you are synchronizing with something outside React, such as
browser APIs, subscriptions, timers, or imperative event listeners.

Avoid using `useEffect` for logic that should happen directly in response to a
user action. Put that logic in the event handler instead.

When `useEffect` is appropriate, always use a named function:

```tsx
useEffect(function handleEscapeKeyListener() {
  const controller = new AbortController();

  window.addEventListener(
    "keydown",
    (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      // handle escape
    },
    { signal: controller.signal },
  );

  return function cleanupEscapeKeyListener() {
    controller.abort();
  };
}, []);
```
