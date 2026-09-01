import type { AgentConsoleSelectOption } from './AgentConsoleSessionState';
import { getDisplayWidth, fitByDisplayWidth } from './AgentConsoleTextWidth';

/**
 * P274: unified overlay presentation model for the select-menu family.
 *
 * Consolidates the hint/title/empty-state literals that were previously
 * scattered across agent-ui and referenced from consoleOptions defaults:
 *   - consoleOptions.selectHint         → AGENT_CONSOLE_OVERLAY_HINTS.select
 *   - consoleOptions.suggestionsHint    → AGENT_CONSOLE_OVERLAY_HINTS.suggestions
 *   - consoleOptions.approvalsHint      → AGENT_CONSOLE_OVERLAY_HINTS.approvals
 *   - Component:6118 palette hint       → AGENT_CONSOLE_OVERLAY_HINTS.palette
 *   - Suggestions:9 AGENT_CONSOLE_SUGGESTIONS_TITLE/HINT → AGENT_CONSOLE_OVERLAY_TITLES.suggestions
 *   - CommandHandlers:786/839 titles    → AGENT_CONSOLE_OVERLAY_TITLES.projects/.threads
 *   - CodingTaskHandlers:485-605 titles → AGENT_CONSOLE_OVERLAY_TITLES coding-task family
 *
 * Pure — no reactive state, no console/node APIs. Shared by TUI (ANSI) and
 * browser (DOM) renderers through deterministic text output.
 */

// ---------------------------------------------------------------------------
// Kind type
// ---------------------------------------------------------------------------

/**
 * Categories of overlay select menus that the presenter can describe.
 * Each kind has canonical hint strings and titles that call sites may
 * override per-render.
 */
export type AgentConsoleOverlayKind =
    | 'select'
    | 'palette'
    | 'suggestions'
    | 'approvals'
    | 'pending-question'
    | 'outputs'
    | 'tasks'
    | 'detail-scroll';

// ---------------------------------------------------------------------------
// Hint catalog — canonical hint strings per kind
// ---------------------------------------------------------------------------

/**
 * Canonical hint strings for each overlay kind.  Every value here is the
 * *single source of truth* that previously lived as literal strings in
 * `consoleOptions` defaults, component inlines, or suggestion consts.
 *  The fallback for any unknown kind is the `select` hint below.
 */
export const AGENT_CONSOLE_OVERLAY_HINTS: Record<AgentConsoleOverlayKind, string> = {
    select: '1-9 select   up/down move   enter confirm   q cancel',
    palette: 'type to filter   enter execute',
    suggestions: 'enter 执行   tab 补全   up/down 选择',
    approvals: 'up/down move   pg jump   a approve   d deny   y copy   esc',
    pendingQuestion: 'up/down move   enter confirm   q cancel',
    outputs: 'up/down move   enter copy   esc close',
    tasks: 'up/down move   pg jump   enter open   esc close',
    detailScroll: '↑/↓ scroll   PgUp/PgDn page   ←/→ columns   Home/End edges   Enter/Esc close',
} as const;

/**
 * Overlay title strings per kind.  Used by call sites that render a titled
 * select menu.  Explicit overrides (passed to `openSelectMenu`) always win.
 */
export const AGENT_CONSOLE_OVERLAY_TITLES: Record<AgentConsoleOverlayKind, string> = {
    palette: 'Command palette',
    suggestions: 'Suggestions',
    approvals: 'Approvals',
    pendingQuestion: 'Pending question',
    outputs: 'Outputs',
    tasks: 'Tasks',
    detailScroll: 'Detail',
} as const;

// ---------------------------------------------------------------------------
// Empty-state notices — shown when an overlay has no options
// ---------------------------------------------------------------------------

export const AGENT_CONSOLE_OVERLAY_EMPTY_STATES: Record<AgentConsoleOverlayKind, string | undefined> = {
    select: undefined,
    palette: undefined,
    suggestions: undefined,
    approvals: undefined,
    pendingQuestion: undefined,
    outputs: undefined,
    tasks: undefined,
    detailScroll: undefined,
} as const;

// ---------------------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------------------

/**
 * Return the canonical hint for `kind`, or `fallback` when the kind is
 * absent from the catalog.  Explicit `hint` argument always wins.
 */
export function resolveOverlayHint(
    kind: AgentConsoleOverlayKind,
    hint?: string,
): string {
    if (hint != null) return hint;
    return AGENT_CONSOLE_OVERLAY_HINTS[kind] ?? AGENT_CONSOLE_OVERLAY_HINTS.select;
}

/**
 * Return the canonical title for `kind`, or `fallback` when absent.
 * Explicit `title` argument always wins.
 */
export function resolveOverlayTitle(
    kind: AgentConsoleOverlayKind,
    title?: string,
): string {
    if (title != null) return title;
    return AGENT_CONSOLE_OVERLAY_TITLES[kind] ?? 'Select';
}

/**
 * Return the canonical empty-state string for `kind`, when the overlay has
 * no options.  `undefined` means "no empty state".
 */
export function resolveOverlayEmptyState(
    kind: AgentConsoleOverlayKind,
    explicit?: string,
): string | undefined {
    if (explicit != null) return explicit;
    return AGENT_CONSOLE_OVERLAY_EMPTY_STATES[kind];
}

// ---------------------------------------------------------------------------
// Presentation model
// ---------------------------------------------------------------------------

/**
 * Data model for an overlay presentation — pure, no reactive state.
 */
export interface AgentConsoleOverlayPresentation {
    kind: AgentConsoleOverlayKind;
    title: string;
    hint: string;
    options: AgentConsoleSelectOption[];
    selectedIndex: number;
    optionCount: number;
    emptyState?: string;
    windowStart?: number;
    windowCount?: number;
}

/**
 * Build a full presentation from a kind plus optional overrides.
 *
 * The returned object always has title/hint from the catalog unless an
 * explicit value is supplied; `selectedIndex` is clamped; emptyState is set
 * only when options are empty.
 */
export function buildOverlayPresentation(
    input: {
        kind: AgentConsoleOverlayKind;
        title?: string;
        hint?: string;
        emptyState?: string;
        options: AgentConsoleSelectOption[];
        selectedIndex?: number;
        /** how many options should be visible at once (TUI window) */
        visibleCount?: number;
    }
): AgentConsoleOverlayPresentation {
    const { kind, title, hint, emptyState, options, selectedIndex, visibleCount } = input;

    // clamp selectedIndex into [0, optionCount)
    let si = typeof selectedIndex === 'number' ? Math.max(0, Math.min(options.length - 1, selectedIndex)) : 0;

    // compute window: how many options to show at once
    let ws = typeof visibleCount === 'number' && visibleCount > 0 ? Math.min(options.length, visibleCount) : options.length;
    let start = typeof visibleCount === 'number' && visibleCount > 0
        ? Math.max(0, Math.min(si - Math.floor(visibleCount / 2), options.length - ws))
        : 0;

    // emptyState only when truly empty
    const empty = options.length === 0 ? resolveOverlayEmptyState(kind, emptyState) : undefined;

    return {
        kind,
        title: title ?? resolveOverlayTitle(kind),
        hint: hint ?? resolveOverlayHint(kind),
        options: options.slice(),
        selectedIndex: si,
        optionCount: options.length,
        emptyState: empty,
        windowStart: start,
        windowCount: ws,
    };
}

/**
 * Compose the line projection that mirrors `renderSelectMenu` from
 * `@tsdi/components/console` — title, blank line, option rows, blank line,
 * hint.  All visible strings are CJK-safe via `fitByDisplayWidth`.
 *
 * The returned array has this exact shape (matching the TUI line layout):
 *   [ titleLines..., '', optionRows..., '', hint ]
 */
export function composeOverlayLines(
    presentation: AgentConsoleOverlayPresentation,
    maxWidth: number,
): string[] {
    const { title, hint, options, selectedIndex, emptyState } = presentation;

    const lines: string[] = [];

    // title — preserve embedded newlines, CJK-clamped
    lines.push(
        ...String(title || '').split('\n').map((l) => fitByDisplayWidth(l, maxWidth)),
    );

    // blank separator
    lines.push('');

    // empty state vs option rows
    if (emptyState) {
        lines.push(fitByDisplayWidth(emptyState, maxWidth));
    } else {
        // option rows: format mirrors formatCommonIndexedOptionLabel
        // (' › N. label' when selected, else ' N. label')
        const labelColumnWidth = options.reduce((w, _opt, i) =>
            Math.max(w,
                getDisplayWidth(
                    fitByDisplayWidth(
                        `${i === selectedIndex ? '›' : ' '} ${i + 1}. ${String(_opt?.label || '')}`,
                        maxWidth,
                    ),
                ),
        ), 0);

        options.forEach((_opt, i) => {
            const row =
                fitByDisplayWidth(
                    `${i === selectedIndex ? '›' : ' '} ${i + 1}. ${String(_opt?.label || '')}`,
                    maxWidth,
                );
            lines.push(row);
        });
    }

    // blank separator before hint
    lines.push('');

    // hint — CJK-safe fit
    if (hint) {
        lines.push(fitByDisplayWidth(hint, maxWidth));
    }

    return lines;
}

/**
 * Resolve the TUI window start index given an option count, selected index,
 * and visible count — mirrors `resolveCommonSelectWindow` from
 * `@tsdi/components/common` (used by AgentConsolePanels).
 */
export function resolveOverlaySelectWindow(
    optionCount: number,
    selectedIndex: number,
    visibleCount: number,
): { start: number; count: number } {
    if (optionCount <= 0) return { start: 0, count: 0 };
    const count = Math.min(optionCount, visibleCount);
    const start = Math.max(0, Math.min(selectedIndex - Math.floor(count / 2), optionCount - count));
    return { start, count };
}

// ---------------------------------------------------------------------------
// Exports for convenience — re‑export the canonical strings so call sites
// can import from this module without importing the whole catalog.
// ---------------------------------------------------------------------------

export {
    AGENT_CONSOLE_OVERLAY_HINTS,
    AGENT_CONSOLE_OVERLAY_TITLES,
    AGENT_CONSOLE_OVERLAY_EMPTY_STATES,
    resolveOverlayHint,
    resolveOverlayTitle,
    resolveOverlayEmptyState,
    buildOverlayPresentation,
    composeOverlayLines,
    resolveOverlaySelectWindow,
};