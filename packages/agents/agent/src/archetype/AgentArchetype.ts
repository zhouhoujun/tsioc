/**
 * P70: declarative agent archetypes.
 *
 * An archetype is a named, reusable session personality. Switching the active
 * archetype changes the system prompt (mode hint + prompt + steps), tool
 * gating (read-only enforcement, allow/deny rules, write-path carve-outs),
 * and optionally the routed model profile. `plan`, `build` and `review` ship
 * built-in; the legacy `setPlanMode(sessionId, true)` API collapses onto the
 * `plan` archetype.
 */

export interface AgentArchetypePermission {
    /** Tool names (or `prefix*` patterns) that remain available while active. When set, only matching tools pass this gate. */
    allow?: string[];
    /** Tool names (or `prefix*` patterns) that are denied while active. */
    deny?: string[];
    /**
     * For readOnly archetypes: workspace-relative path prefixes under which
     * write-capable tools may still operate (e.g. `['plans']` allows writing
     * `plans/*.md`). Matching scans string values of the tool input.
     */
    writePaths?: string[];
}

export interface AgentArchetype {
    name: string;
    description?: string;
    /** `primary` = interactive session personality; `subagent` = delegation worker. */
    mode?: 'primary' | 'subagent';
    /**
     * When true, tools without `execution.readOnly` are denied before
     * execution (the same gate plan mode uses today) unless the tool input
     * satisfies `permissions.writePaths`.
     */
    readOnly?: boolean;
    /** Tool gating rules applied while this archetype is active. */
    permissions?: AgentArchetypePermission;
    /** Extra system prompt section appended while active. */
    prompt?: string;
    /** Named model profile pinned while active. */
    model?: string;
    /** Ordered step hints injected into the system prompt on switch. */
    steps?: string[];
}

/** Archetype applied when a session has no explicit override. */
export const DEFAULT_ARCHETYPE = 'build';

/** Built-in archetypes. Custom archetypes may override these by name. */
export const BUILT_IN_ARCHETYPES: Record<string, AgentArchetype> = {
    build: {
        name: 'build',
        description: 'Full execution: read, write, run commands, and iterate until the task is complete.',
        mode: 'primary'
    },
    plan: {
        name: 'plan',
        description: 'Read-only planning: inspect state, search memory, and propose a plan. Write tools are denied except under plans/.',
        mode: 'primary',
        readOnly: true,
        permissions: {
            writePaths: ['plans']
        },
        prompt: 'This session is in PLAN MODE (read-only). Inspect the workspace, retrieve context, and produce a step-by-step plan. Do not call tools that write, modify, or execute with side effects - such calls are denied by the runtime except under the plans/ directory.',
        steps: [
            '1. Understand the task and inspect relevant state with read-only tools.',
            '2. Identify risks, constraints, and affected modules.',
            '3. Write a concrete plan to plans/<name>.md.',
            '4. Wait for the user to switch to the build archetype before implementing.'
        ]
    },
    review: {
        name: 'review',
        description: 'Read-only review: inspect changes, run verification, and report findings without mutating files.',
        mode: 'primary',
        readOnly: true,
        prompt: 'This session is in REVIEW MODE (read-only). Inspect diffs and state, run verification tools, and report findings. Do not call tools that write, modify, or execute with side effects.',
        steps: [
            '1. Identify the changes under review.',
            '2. Verify behavior with read-only tools.',
            '3. Report findings: correctness, risks, and suggested fixes.'
        ]
    }
};

/** Resolve an archetype by name from the configured pool plus built-ins. */
export function resolveArchetype(
    archetypes: Record<string, AgentArchetype> | undefined,
    name: string | undefined
): AgentArchetype | undefined {
    if (!name) {
        return undefined;
    }
    const pool = { ...BUILT_IN_ARCHETYPES, ...(archetypes ?? {}) };
    return pool[name];
}

/** All available archetypes (built-ins plus configured overrides). */
export function listArchetypes(archetypes?: Record<string, AgentArchetype>): AgentArchetype[] {
    const pool = { ...BUILT_IN_ARCHETYPES, ...(archetypes ?? {}) };
    return Object.values(pool);
}

/**
 * System-prompt mode hint for an active archetype. The plain build archetype
 * (no readOnly / prompt / steps / permissions) yields an empty hint so
 * default sessions keep today's system prompt byte-for-byte.
 */
export function buildArchetypeModeHint(archetype: AgentArchetype | undefined): string {
    if (!archetype) {
        return '';
    }
    const readOnly = archetype.readOnly === true;
    const hasPrompt = !!archetype.prompt;
    const hasSteps = !!archetype.steps?.length;
    const hasPermissions = !!archetype.permissions;
    if (!readOnly && !hasPrompt && !hasSteps && !hasPermissions) {
        return '';
    }
    const lines: string[] = [
        `## Session mode\nThis session is in ${archetype.name.toUpperCase()} MODE${readOnly ? ' (read-only)' : ''}.`
    ];
    if (readOnly) {
        lines.push('Do not call tools that write, modify, or execute with side effects - such calls are denied by the runtime. Propose a plan and wait for the user to switch modes.');
    } else {
        lines.push('Full tool execution is available.');
    }
    if (archetype.prompt) {
        lines.push(archetype.prompt);
    }
    if (archetype.steps?.length) {
        lines.push(`Suggested steps:\n${archetype.steps.join('\n')}`);
    }
    return `\n\n${lines.join('\n\n')}`;
}

/** Switch message appended to a session transcript when the archetype changes mid-conversation. */
export function buildArchetypeSwitchMessage(archetype: AgentArchetype, previous?: string): string {
    const lines = [
        `## Archetype switch\nThis session switched from "${previous || 'default'}" to the "${archetype.name}" archetype.`,
        archetype.description ?? `Mode: ${archetype.mode ?? 'primary'}${archetype.readOnly ? ' (read-only)' : ''}.`
    ];
    if (archetype.steps?.length) {
        lines.push(`Suggested steps:\n${archetype.steps.join('\n')}`);
    }
    return lines.join('\n\n');
}
