export function decodeGlobalKey(raw: string): string {
    if (raw === '\u001b') return 'escape';
    if (raw === '\t') return 'tab';
    const arrows: Record<string, string> = {
        '\u001b[A': 'up',
        '\u001b[B': 'down',
        '\u001b[C': 'right',
        '\u001b[D': 'left'
    };
    const arrow = arrows[raw];
    if (arrow) return arrow;
    const navigation: Record<string, string> = {
        '\u001b[5~': 'pageup',
        '\u001b[6~': 'pagedown',
        '\u001b[H': 'home',
        '\u001b[F': 'end',
        '\u001b[1~': 'home',
        '\u001b[4~': 'end',
        '\u001b[7~': 'home',
        '\u001b[8~': 'end'
    };
    const navKey = navigation[raw];
    if (navKey) return navKey;
    const functionKeys: Record<string, string> = {
        '\u001b[12~': 'f2',
        '\u001bOQ': 'f2',
        '\u001b[1;2Q': 'shift+f2',
        '\u001b[1;12~': 'shift+f2'
    };
    const functionKey = functionKeys[raw];
    if (functionKey) return functionKey;
    const modifiedKeys: Record<string, string> = {
        '\u001b\u000b': 'ctrl+alt+k'
    };
    const modifiedKey = modifiedKeys[raw];
    if (modifiedKey) return modifiedKey;
    if (raw.length === 1) {
        const code = raw.charCodeAt(0);
        if (code >= 1 && code <= 26) return `ctrl+${String.fromCharCode(96 + code)}`;
        if (!/[\u0000-\u001f\u007f]/.test(raw)) {
            if (code >= 65 && code <= 90) return `shift+${raw.toLowerCase()}`;
            return raw.toLowerCase();
        }
    }
    return '';
}

export function resolveToolCallArgument(input: any): string {
    if (input === undefined || input === null) {
        return '';
    }
    let value = '';
    if (typeof input === 'string') {
        value = input;
    } else if (typeof input === 'object') {
        const preferred = [
            'path', 'file_path', 'filePath', 'file', 'filename', 'dir', 'directory', 'folder',
            'pattern', 'glob', 'query', 'q', 'command', 'cmd', 'prompt', 'target', 'url', 'name', 'id'
        ];
        for (const key of preferred) {
            const candidate = (input as Record<string, any>)[key];
            if (typeof candidate === 'string' && candidate.trim()) {
                value = candidate.trim();
                break;
            }
        }
        if (!value) {
            const first = Object.values(input as Record<string, any>)
                .find(candidate => typeof candidate === 'string' && candidate.trim());
            if (typeof first === 'string') {
                value = first.trim();
            }
        }
    }
    const collapsed = value.replace(/\s+/g, ' ').trim();
    return collapsed.length > 48 ? `${collapsed.slice(0, 47)}…` : collapsed;
}

export function resolveStreamEventLabel(eventType: string): string {
    switch (eventType) {
        case 'reasoning':
            return 'think';
        case 'tool_invoked':
        case 'tool_completed':
        case 'tool_failed':
        case 'tool_skipped':
            return 'tool';
        case 'approval_requested':
        case 'approval_completed':
        case 'approval_failed':
            return 'approval';
        case 'error':
            return 'error';
        default:
            return 'state';
    }
}

export function resolveToolEventName(chunk: any): string {
    const explicit = String(chunk?.toolName || '').trim();
    if (explicit) {
        return explicit;
    }
    const content = String(chunk?.content || '').trim();
    if (!content) {
        return '';
    }
    return content
        .split(/[·:(]/, 1)[0]
        .replace(/\s+(completed|failed|skipped)$/i, '')
        .trim();
}

export function resolveToolEventKey(eventType: string, chunk: any): string | undefined {
    switch (eventType) {
        case 'tool_call':
        case 'tool_invoked':
        case 'tool_completed':
        case 'tool_failed':
        case 'tool_skipped': {
            const toolCallId = String(chunk?.toolCallId || chunk?.receipt?.toolCallId || '').trim();
            const receiptId = String(chunk?.receiptId || chunk?.receipt?.receiptId || '').trim();
            if (toolCallId || receiptId) {
                return `tool:${toolCallId || receiptId}`;
            }
            const toolName = resolveToolEventName(chunk);
            return toolName ? `tool:${toolName}` : undefined;
        }
        default:
            return undefined;
    }
}

export function formatToolCallLabel(call: any, translator?: any): string {
    const name = String(call?.name || '').trim();
    if (!name) {
        return '';
    }
    const label = resolveAgentToolLabel(translator, name);
    const argument = resolveToolCallArgument(call?.input);
    // Pending and completed rows compose the same line (`<label> · <object>`),
    // so the in-place merge never changes the row's shape. Success is carried by
    // the status glyph, not by a `completed` word.
    return argument ? `${label} · ${argument}` : label;
}

/**
 * Resolve a human-readable label for a tool name.
 *
 * When the translator has no entry for `agent.tool.<name>` it returns the key
 * unchanged; in that case (and when there is no translator) fall back to a
 * humanized name so a raw `agent.tool.*` key never leaks into the UI.
 */
export function resolveAgentToolLabel(translator: any, toolName: string): string {
    const name = String(toolName || '').trim();
    if (!name) {
        return '';
    }
    const key = `agent.tool.${name}`;
    const translated = translator?.translate?.(key);
    if (typeof translated === 'string' && translated && translated !== key) {
        return translated;
    }
    return humanizeAgentToolName(name);
}

function humanizeAgentToolName(name: string): string {
    return name.replace(/[._-]+/g, ' ').trim();
}

export function describePendingToolCall(chunk: any, translator?: any): string {
    const toolCalls = Array.isArray(chunk?.toolCalls) ? chunk.toolCalls : [];
    if (toolCalls.length) {
        const parts = toolCalls
            .map((call: any) => formatToolCallLabel(call, translator))
            .filter(Boolean);
        if (parts.length) {
            return parts.length > 3
                ? [...parts.slice(0, 3), `+${parts.length - 3} more`].join(' · ')
                : parts.join(' · ');
        }
    }
    const text = String(chunk?.content || '').trim();
    if (!text) {
        return 'tool';
    }
    const toolName = resolveToolEventName(chunk);
    return toolName || text;
}

/**
 * One pending row per streamed tool invocation.
 *
 * `toolCalls[i].id` is the same provider-assigned identity the runtime copies
 * into `receipt.toolCallId`, so keying on it lets the pending row merge in place
 * with its own `tool_completed` event. Keying on the tool name instead collapses
 * every invocation of the same tool onto one row, which both hides the other
 * invocations and orphans the pending row from its completion.
 */
export interface PendingToolCallRow {
    key?: string;
    content: string;
    toolCallId?: string;
}

export function resolvePendingToolCallRows(chunk: any, translator?: any): PendingToolCallRow[] {
    const toolCalls = Array.isArray(chunk?.toolCalls) ? chunk.toolCalls : [];
    const rows: PendingToolCallRow[] = toolCalls
        .map((call: any): PendingToolCallRow => {
            const toolCallId = String(call?.id || '').trim();
            return {
                key: toolCallId ? `tool:${toolCallId}` : undefined,
                content: formatToolCallLabel(call, translator),
                toolCallId: toolCallId || undefined
            };
        })
        .filter((row: PendingToolCallRow) => !!row.content);
    if (rows.length) {
        return rows;
    }
    // Adapters that only set a top-level `toolCallId` keep the single-row shape.
    return [{
        key: resolveToolEventKey('tool_call', chunk),
        content: describePendingToolCall(chunk, translator),
        toolCallId: String(chunk?.toolCallId || '').trim() || undefined
    }];
}

/**
 * Compose one tool row from its input/output summaries.
 *
 * The live stream, a replayed session transcript and the local runtime events
 * all describe the same tool call, so they share this formula: the localized
 * tool label, the object acted on, and a result summary that never repeats that
 * object (`Read file · README.md (truncated)`, not `Read README.md · README.md
 * (truncated)`). Success is carried by the status glyph, so no `completed` word
 * is added here.
 */
export function formatToolEventRow(
    toolName: string,
    inputSummary: string | undefined,
    outputSummary: string | undefined,
    error: string | undefined,
    translator?: any
): string {
    const name = String(toolName || '').trim();
    const input = String(inputSummary || '').trim();
    const output = String(outputSummary || '').trim();
    const reason = String(error || '').trim();
    if (reason) {
        return describeStreamEventContent(
            'tool_failed',
            { toolName: name, content: `${name} failed: ${reason}` },
            translator
        );
    }
    const detail = input && output && !output.includes(input)
        ? `${input} · ${output}`
        : (output || input);
    return describeStreamEventContent(
        'tool_completed',
        { toolName: name, content: detail ? `${name} · ${detail}` : name },
        translator
    );
}

export function describeStreamEventContent(eventType: string, chunk: any, translator?: any): string {
    const content = String(chunk?.content || '').trim();
    const toolName = String(chunk?.toolName || '').trim();
    if (!toolName || !eventType.startsWith('tool_')) {
        return content;
    }
    const label = resolveAgentToolLabel(translator, toolName);
    const detail = content.includes(' · ') ? content.slice(content.indexOf(' · ') + 3).trim() : '';
    if (eventType === 'tool_invoked') {
        // Same shape as the pending row and the replayed row: verb + object.
        // The `●` glyph already says "running"; a `Running` prefix repeated the
        // state and made the row flicker when it became `… completed`.
        return detail ? `${label} · ${detail}` : label;
    }
    if (eventType === 'tool_completed') {
        // Success is the glyph (`✓`), not a word. Keeping `completed` here made
        // live rows read `Read file completed · README.md` while a reloaded
        // session read `Read README.md` (same tool call, two identities).
        return detail ? `${label} · ${detail}` : label;
    }
    if (eventType === 'tool_failed' && toolName === 'git_operations' && /not a Git repository/i.test(content)) {
        return translator?.translate('agent.tool.gitMissing') || 'Git repository not detected. If you want version control, ask the agent to initialize one (git init).';
    }
    if (eventType === 'tool_failed' && toolName === 'web_search' && /search adapter/i.test(content)) {
        return translator?.translate('agent.tool.searchUnavailable') || 'Web search is not configured; add a search adapter in settings.';
    }
    if (eventType === 'tool_failed' || eventType === 'tool_skipped') {
        // The cause is the actionable part of a failure/skip. A bare
        // "{label} failed" hides it and forces a trip to the inspector, so keep
        // the producer's reason (bounded by the row renderer) on the mainline.
        const reason = resolveToolEventReason(content, detail);
        const fallbackVerb = eventType === 'tool_failed' ? 'failed' : 'skipped';
        const fallback = reason ? `${label} ${fallbackVerb}: ${reason}` : `${label} ${fallbackVerb}`;
        const key = eventType === 'tool_failed'
            ? (reason ? 'agent.tool.failedWithError' : 'agent.tool.failed')
            : (reason ? 'agent.tool.skippedWithReason' : 'agent.tool.skipped');
        return translator?.translate(key, reason ? { label, error: reason, reason } : { label }) || fallback;
    }
    return content;
}

/**
 * Reduce a tool failure/skip message to its actionable cause.
 *
 * Producers prefix the content with the raw tool name (e.g.
 * `content_search failed: ENOTDIR …`). The row already carries the translated
 * action label, so that prefix is noise and the cause is what the user needs.
 */
function resolveToolEventReason(content: string, detail: string): string {
    const direct = String(detail || '').trim();
    if (direct) {
        return direct;
    }
    const line = String(content || '')
        .split('\n')
        .map(entry => entry.trim())
        .find(entry => entry && !/^\S+\s+(?:failed|skipped)$/i.test(entry))
        || '';
    return line.replace(/^.*?\b(?:failed|skipped)\s*:?\s*/i, '').trim();
}
