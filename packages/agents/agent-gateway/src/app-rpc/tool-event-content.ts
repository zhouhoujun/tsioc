/**
 * Tool-event content formation for streamed `run.turn_stream` chunks.
 *
 * Kept out of `AppRpcServer` so the RPC server stays a transport/route layer.
 * A receipt summary is either a JSON payload or plain text; these helpers turn
 * it into the single-line object/result the timeline renders, while the raw
 * payload stays available to the inspector on the tool message.
 */

function pickString(value: unknown): string {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function parseToolSummary(text: string): Record<string, any> | undefined {
    try {
        const payload = JSON.parse(text);
        return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : undefined;
    } catch {
        return undefined;
    }
}

function pickPathSummary(payload: Record<string, any>): string {
    const single = pickString(payload.path)
        || pickString(payload.file)
        || pickString(payload.filePath)
        || pickString(payload.dir)
        || pickString(payload.directory)
        || pickString(payload.from)
        || pickString(payload.to);
    if (single) {
        return single;
    }
    if (Array.isArray(payload.paths)) {
        const values = payload.paths.map((value: unknown) => pickString(value)).filter(Boolean);
        if (values.length) {
            return values.join(', ');
        }
    }
    return '';
}

export function summarizeToolEventDetail(toolName: string, summary: unknown, phase: 'input' | 'output'): string {
    const text = String(summary || '').trim();
    if (!text || text === '{}' || text === '[]') {
        return '';
    }
    const payload = parseToolSummary(text);
    if (!payload) {
        return text;
    }

    const pathSummary = pickPathSummary(payload);
    if (pathSummary) {
        if (toolName === 'read_file' && phase === 'output' && payload.truncated === true) {
            return `${pathSummary} (truncated)`;
        }
        return pathSummary;
    }

    if (toolName === 'location') {
        const label = pickString(payload.label)
            || [pickString(payload.city), pickString(payload.region), pickString(payload.countryCode) || pickString(payload.country)]
                .filter(Boolean)
                .join(', ');
        return label || '';
    }

    if (toolName === 'weather') {
        const location = pickString(payload.location) || pickString(payload.label);
        const temperature = typeof payload.temperature === 'number' ? payload.temperature : undefined;
        const description = pickString(payload.description);
        const unit = payload.units === 'imperial' ? 'F' : 'C';
        return [location, temperature !== undefined ? `${temperature}°${unit}` : '', description].filter(Boolean).join(' ');
    }

    const url = pickString(payload.url) || pickString(payload.href);
    if (url) {
        return url;
    }

    const location = pickString(payload.location) || pickString(payload.label) || pickString(payload.name);
    if (location) {
        return location;
    }

    return text;
}

export function describeToolInvocationEvent(data: any): string {
    const toolName = String(data?.toolName || 'tool');
    const summary = summarizeToolEventDetail(toolName, data?.receipt?.inputSummary ?? data?.inputSummary, 'input');
    return summary ? `${toolName} · ${summary}` : toolName;
}

export function describeToolCompletedEvent(data: any): string {
    const toolName = String(data?.toolName || 'tool');
    const outputSummary = summarizeToolEventDetail(toolName, data?.receipt?.outputSummary, 'output');
    if (!outputSummary) {
        return `${toolName} completed`;
    }
    // The completed row replaces the invocation row (same toolCallId), so the
    // object the tool acted on would otherwise vanish from the timeline. Keep it
    // unless the output already repeats it (e.g. read_file's pathSummary).
    const inputSummary = summarizeToolEventDetail(toolName, data?.receipt?.inputSummary ?? data?.inputSummary, 'input');
    const detail = inputSummary && !outputSummary.includes(inputSummary)
        ? `${inputSummary} · ${outputSummary}`
        : outputSummary;
    return `${toolName} · ${detail}`;
}
