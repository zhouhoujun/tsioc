# Per-session state migration (framework-reactive, no get/set)

## Principle

`@tsdi/components` is a Proxy-based reactive framework: a component reading
`obj.field` registers a dependency and a property write notifies the bindings.
Per-session state must use that mechanism directly.

**Forbidden:**

- hand-written `get`/`set` accessors used to forward to another object;
- a custom `Proxy` facade in front of `AgentConsoleSessionState` (adds a second
  proxy hop on every read and duplicates the framework's tracking);
- manual `subscribe`/`notify` fan-out (the framework already tracks writes).

**Required:**

- raw per-session state objects wrapped by the framework (`reactive()`);
- a reactive hub object whose `active` property is an ordinary data property;
- switching tabs = `hub.active = nextState` (a normal Proxy write);
- bindings read `hub.active.<field>`, so the framework tracks/notifies.

## Target shape

```ts
interface AgentConsoleSessionHub {
    active: AgentConsoleSessionState;      // ordinary reactive data property
    activeSessionId: string;
    states: Map<string, AgentConsoleSessionState>;
    stateFor(sessionId: string): AgentConsoleSessionState;
    activate(sessionId: string): void;     // hub.active = ...
    forget(sessionId: string): void;
}
```

`activeSessionStateMessage` and other derivations must read `hub.active`
directly in the binding; no forwarding accessors.

## Migration order

1. **Hub + provider**: add `AGENT_CONSOLE_SESSION_HUB`; provide a raw hub object
   (the framework wraps it when a component reads it). Keep the current
   `AgentConsoleSessionState` provider temporarily for untouched code.
2. **Transcript first** (highest render cost): panels take
   `hub.active` (per-session state) and `v-show` per open session. Track the
   active id via `hub.activeSessionId`. This is the step that removes the
   1k-message reprojection on tab switch.
3. **Controllers/hosts**: move `AgentConsoleComponent` and host helpers from
   `this.state` to `this.hub.active` (mechanical, per module). Do not add a
   facade; the hub is the stable object.
4. **Event routing**: `AgentConsoleRemoteEventBridge` writes to
   `hub.stateFor(event.sessionId)` instead of the single state. Background
   turns then keep a real per-session transcript.
5. **Global/session field classification**: explicit `GLOBAL_FIELDS` table;
   copy globals on session creation (theme/model/options/actions), keep
   messages/input/plan/approvals/scroll per session.
6. **Perf gate**: 4 tabs × 1000 messages must keep
   `sync p50 <= 52ms`, `render <= 28.7ms`, and 1 frame per background switch.
   Any regression rejects the step.

## Why the previous attempt was reverted

- Backed by a custom Proxy facade (get/set traps) → every state read paid an
  extra proxy hop plus `isSubscribable` probing.
- Measured: 1k tab switch sync p50 52ms → 168–237ms, render 28.7ms → 62–87ms.
- Functionally the suite passed (2165), but performance is the acceptance
  criterion, so the step was reverted. Do not reintroduce accessors/facades.
