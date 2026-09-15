/**
 * P300 · Timeline event presenter
 *
 * Pure, dependency-free module that derives a structured presentation from raw
 * tool-event fields.  The output feeds the main conversation line ("action +
 * object") while raw payloads are reserved for the inspector (P303).
 *
 * Stable vocabulary covers: read / edit / write / search / shell / git / MCP /
 * background task.  Unknown tools fall back to {@link humanizeToolName}.
 *
 * @module
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type TimelineToolCategory =
    | 'read'
    | 'edit'
    | 'write'
    | 'search'
    | 'shell'
    | 'git'
    | 'mcp'
    | 'background'
    | 'generic';

export interface TimelineToolEventInput {
    /** Tool event type (tool_invoked / tool_completed / tool_failed / background_task_*) */
    eventType?: string;
    /** Canonical tool name (read_file, shell, git_operations, …) */
    toolName?: string;
    /** Summarised input produced by the agent receipt */
    inputSummary?: string;
    /** Summarised output produced by the agent receipt */
    outputSummary?: string;
    /** Error message for failed events */
    error?: string;
    /** Lifecycle status (running / success / error / failed) */
    status?: string;
    /** Background-task ID for background_task_* events */
    taskId?: string;
}

export interface TimelineToolEventPresentation {
    /** Stable verb — 'Read' / 'Edit' / 'Write' / 'Search' / 'Run' / 'Git' / 'MCP call' / 'Background task' */
    title: string;
    /** Object noun — file path / command / pattern / task id / humanised tool name */
    target: string;
    /** Short single-line result summary (≤ ~120 chars).  Empty when no meaningful summary exists. */
    summary: string;
    /** Full raw payload kept for the inspector — never shown on the main line. */
    detail: string;
    /** Stable category vocabulary key */
    category: TimelineToolCategory;
}

// ── Constants ───────────────────────────────────────────────────────────────

const SUMMARY_BUDGET = 120;

const TOOL_CATEGORY_MAP: Record<string, TimelineToolCategory> = {
    // read
    read_file: 'read',
    read_file_lines: 'read',
    read: 'read',
    view: 'read',
    get_file_contents: 'read',
    list_dir: 'read',
    list_directory: 'read',
    glob: 'read',
    // edit
    edit_file: 'edit',
    edit: 'edit',
    apply_patch: 'edit',
    patch: 'edit',
    replace: 'edit',
    replace_in_file: 'edit',
    // write
    write_file: 'write',
    write: 'write',
    create_file: 'write',
    new_file: 'write',
    append: 'write',
    overwrite: 'write',
    overwrite_file: 'write',
    // search
    search: 'search',
    search_files: 'search',
    grep: 'search',
    find: 'search',
    web_search: 'search',
    search_web: 'search',
    find_files: 'search',
    semantic_search: 'search',
    // shell
    shell: 'shell',
    terminal: 'shell',
    run_command: 'shell',
    exec: 'shell',
    bash: 'shell',
    execute_command: 'shell',
    command: 'shell',
    run_shell: 'shell',
    // git
    git: 'git',
    git_operations: 'git',
    git_status: 'git',
    git_diff: 'git',
    git_commit: 'git',
    git_add: 'git',
    git_log: 'git',
    // mcp
    mcp: 'mcp',
    mcp_call: 'mcp',
    mcp_tool: 'mcp',
    mcp_tool_call: 'mcp',
    tool_call: 'mcp',
    // background
    background_task: 'background',
    subagent: 'background',
    subtask: 'background',
    task_start: 'background',
};

const CATEGORY_TITLE: Record<TimelineToolCategory, string> = {
    read: 'Read',
    edit: 'Edit',
    write: 'Write',
    search: 'Search',
    shell: 'Run',
    git: 'Git',
    mcp: 'MCP call',
    background: 'Background task',
    generic: '',
};

// Path-like fields to extract from JSON input summaries (tried in order).
const PATH_FIELDS = ['path', 'file', 'filePath', 'dir', 'directory', 'from', 'to', 'target'];
const COMMAND_FIELDS = ['command', 'cmd', 'shell', 'script', 'expression'];
const SEARCH_FIELDS = ['pattern', 'query', 'keyword', 'search'];
const URL_FIELDS = ['url', 'href', 'endpoint'];
const LABEL_FIELDS = ['label', 'name', 'location', 'city', 'region', 'country', 'tool', 'toolName'];

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse JSON safely, returning the object when valid and an object, or undefined.
 */
function safeParseJson(text: string): Record<string, unknown> | undefined {
    try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : undefined;
    } catch {
        return undefined;
    }
}

function pickString(value: unknown): string {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function pickArrayStrings(value: unknown): string[] {
    return Array.isArray(value)
        ? value.map(v => pickString(v)).filter(Boolean)
        : [];
}

function truncateSummary(text: string): string {
    const single = text.replace(/\s+/g, ' ').trim();
    if (single.length <= SUMMARY_BUDGET) return single;
    return single.slice(0, SUMMARY_BUDGET - 3) + '...';
}

/**
 * Humanise a tool name: split on separators / camel boundaries → sentence-case.
 * Light re-implementation that avoids the public `humanizeToolName` from
 * `AgentConsoleTimelineWindow` to keep this module free of cross-imports.
 */
function humanizeToolNameLocal(name: string): string {
    const raw = name.trim();
    if (!raw) return '';

    return raw
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .split(/[^A-Za-z0-9]+/)
        .filter(w => w.length > 0)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

// ── Core API ────────────────────────────────────────────────────────────────

/**
 * Resolve the stable category for a tool name.
 *
 * Prefix matching is tried first (e.g. "read_file" matches "read"), then exact
 * lookup, then a set of common prefix heuristics.  Falls back to `'generic'`.
 */
export function resolveTimelineToolCategory(toolName: string): TimelineToolCategory {
    const normalised = toolName.trim().toLowerCase();
    if (!normalised) return 'generic';

    // Exact match
    if (normalised in TOOL_CATEGORY_MAP) {
        return TOOL_CATEGORY_MAP[normalised];
    }

    // Prefix match — e.g. "read_file_xyz" → read, "git_push_origin" → git
    const underscoreIdx = normalised.indexOf('_');
    if (underscoreIdx > 0) {
        const prefix = normalised.slice(0, underscoreIdx);
        if (prefix in TOOL_CATEGORY_MAP) return TOOL_CATEGORY_MAP[prefix];
    }

    // Heuristic prefix grouping for names like "shell_exec", "mcp_foo"
    for (const prefix of ['read', 'edit', 'write', 'search', 'shell', 'git', 'mcp', 'background']) {
        if (normalised.startsWith(prefix)) return TOOL_CATEGORY_MAP[prefix];
    }

    return 'generic';
}

/**
 * Extract a short, human-readable target string from a JSON or plain-text input
 * summary.  Prefers canonical fields (path, command, pattern, url, label) and
 * falls back to the raw string when it looks like a single path or value.
 */
export function resolveToolEventTarget(
    inputSummary: string | undefined,
    category: TimelineToolCategory,
): string {
    const raw = pickString(inputSummary);
    if (!raw) return '';

    const payload = safeParseJson(raw);
    if (!payload) {
        // Plain string — likely a path, command, or label already.
        return raw.length > SUMMARY_BUDGET ? truncateSummary(raw) : raw;
    }

    // Category-aware field priority
    if (category === 'read' || category === 'edit' || category === 'write') {
        for (const field of PATH_FIELDS) {
            const val = pickString(payload[field]);
            if (val) return val;
        }
        const paths = pickArrayStrings(payload.paths);
        if (paths.length) return paths.join(', ');
    }

    if (category === 'search') {
        for (const field of [...SEARCH_FIELDS, ...PATH_FIELDS, ...COMMAND_FIELDS]) {
            const val = pickString(payload[field]);
            if (val) return val;
        }
    }

    if (category === 'shell') {
        for (const field of COMMAND_FIELDS) {
            const val = pickString(payload[field]);
            if (val) return truncateSummary(val);
        }
    }

    // Fallback: try any commonly meaningful field
    for (const fields of [PATH_FIELDS, COMMAND_FIELDS, SEARCH_FIELDS, URL_FIELDS, LABEL_FIELDS]) {
        for (const field of fields) {
            const val = pickString(payload[field]);
            if (val) return val;
        }
    }

    return '';
}

/**
 * Derive a short result summary from an output or error string.
 * Returns the first meaningful line truncated to {@link SUMMARY_BUDGET}.
 * For JSON payloads, tries common summary/result/message fields before falling
 * back to an empty string (raw JSON belongs in the inspector).
 */
export function resolveToolEventSummary(
    outputSummary: string | undefined,
    error: string | undefined,
): string {
    const errText = pickString(error);
    if (errText) return truncateSummary(errText);

    const raw = pickString(outputSummary);
    if (!raw) return '';

    const payload = safeParseJson(raw);
    if (payload) {
        for (const field of ['summary', 'result', 'message', 'label', 'text']) {
            const val = pickString(payload[field]);
            if (val) return truncateSummary(val);
        }
        // No known short field — raw JSON goes to detail, return empty.
        return '';
    }

    // JSON-looking (object/array) without known fields also goes to detail.
    if (raw.startsWith('{') || raw.startsWith('[')) {
        return '';
    }

    return truncateSummary(raw);
}

/**
 * Build the raw detail string (for the inspector) from raw inputs.
 */
export function buildToolEventDetail(
    inputSummary: string | undefined,
    outputSummary: string | undefined,
    error: string | undefined,
): string {
    const parts: string[] = [];
    const inp = pickString(inputSummary);
    const out = pickString(outputSummary);
    const err = pickString(error);
    if (inp) parts.push(inp);
    if (out) parts.push(out);
    if (err) parts.push(err);
    return parts.join('\n');
}

/**
 * Main presenter — derive `{ title, target, summary, detail, category }` from
 * raw tool-event fields.
 *
 * The caller composes the main conversation line as:
 * ```
 * `${title} ${target}`
 * ```
 * and appends a short `summary` only when non-empty.
 */
export function presentTimelineToolEvent(
    input: TimelineToolEventInput,
): TimelineToolEventPresentation {
    const toolName = pickString(input.toolName);
    const category = toolName
        ? resolveTimelineToolCategory(toolName)
        : (input.eventType?.startsWith('background_task') ? 'background' : 'generic');

    const title = CATEGORY_TITLE[category] || humanizeToolNameLocal(toolName);
    const target = resolveToolEventTarget(input.inputSummary, category);
    const summary = resolveToolEventSummary(input.outputSummary, input.error);
    const detail = buildToolEventDetail(input.inputSummary, input.outputSummary, input.error);

    return { title, target, summary, detail, category };
}

/**
 * Compose the main-line text from a presentation.
 *
 * Format: `"<title> <target>"` or `"<title> <target> · <summary>"` when a
 * summary is present.  When target is empty the title alone is returned.
 */
export function formatTimelineEventLine(p: TimelineToolEventPresentation): string {
    const parts: string[] = [];
    if (p.target) {
        parts.push(`${p.title} ${p.target}`);
    } else {
        parts.push(p.title);
    }
    if (p.summary) {
        parts.push(p.summary);
    }
    return parts.join(' · ');
}

/**
 * Map a raw lifecycle status to a human-readable word, preferring the
 * matching UI label.  Unknown statuses pass through unchanged.
 *
 * success  → footerDone            (e.g. 完成 / Done)
 * failed / error → footerFailed    (e.g. 失败 / Failed)
 * running / reasoning → footerRunning (e.g. 进行中 / Running)
 * cancelled → collapsedOutcomeCancelled (e.g. 已取消 / Cancelled)
 */
export function resolveHumanStatusWord(
    status: string | undefined,
    labels?: {
        footerDone?: string;
        footerFailed?: string;
        footerRunning?: string;
        collapsedOutcomeCancelled?: string;
    }
): string {
    switch (status) {
        case 'success':
            return labels?.footerDone || 'Done';
        case 'failed':
        case 'error':
            return labels?.footerFailed || 'Failed';
        case 'running':
        case 'reasoning':
            return labels?.footerRunning || 'Running';
        case 'cancelled':
            return labels?.collapsedOutcomeCancelled || 'Cancelled';
        default:
            return String(status || '');
    }
}
