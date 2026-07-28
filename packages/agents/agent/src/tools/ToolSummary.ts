export function summarizeToolDisplayText(
    toolName: string,
    value: unknown,
    phase: 'input' | 'output' = 'output'
): string | undefined {
    const payload = normalizeToolPayload(value);
    if (payload) {
        return summarizeToolPayload(toolName, payload, phase);
    }

    const text = normalizeText(value);
    if (!text) {
        return undefined;
    }

    if (phase === 'input') {
        return text;
    }

    return text.length > 200 ? `${text.slice(0, 200)}...[truncated]` : text;
}

function summarizeToolPayload(toolName: string, payload: Record<string, any>, phase: 'input' | 'output'): string | undefined {
    if (toolName === 'read_file') {
        const path = pickString(payload.path);
        if (path) {
            return payload.truncated === true && phase === 'output' ? `${path} (truncated)` : path;
        }
    }

    if (toolName === 'list_dir') {
        return summarizePathCollection(
            payload.path,
            Array.isArray(payload.entries) ? payload.entries : [],
            item => pickString(item?.path) || pickString(item?.name),
            payload.truncated === true
        );
    }

    if (toolName === 'glob_search') {
        return summarizeStringCollection(
            'match',
            Array.isArray(payload.matches) ? payload.matches : [],
            payload.truncated === true
        );
    }

    if (toolName === 'todo') {
        return summarizeTodoPayload(payload);
    }

    if (toolName === 'coding_task') {
        return summarizeCodingTaskPayload(payload);
    }

    if (toolName === 'spawn_agent') {
        return summarizeSpawnAgentPayload(payload);
    }

    if (toolName === 'location') {
        return pickString(payload.label)
            || [pickString(payload.city), pickString(payload.region), pickString(payload.countryCode) || pickString(payload.country)]
                .filter(Boolean)
                .join(', ')
            || undefined;
    }

    if (toolName === 'weather') {
        const location = pickString(payload.location) || pickString(payload.label);
        const temperature = typeof payload.temperature === 'number' ? payload.temperature : undefined;
        const description = pickString(payload.description);
        const unit = payload.units === 'imperial' ? 'F' : 'C';
        return [location, temperature !== undefined ? `${temperature}°${unit}` : '', description].filter(Boolean).join(' ');
    }

    const pathSummary = pickString(payload.path)
        || pickString(payload.file)
        || pickString(payload.filePath)
        || pickString(payload.dir)
        || pickString(payload.directory)
        || pickString(payload.from)
        || pickString(payload.to);
    if (pathSummary) {
        return pathSummary;
    }

    const summary = pickString(payload.summary);
    if (summary) {
        return summary;
    }

    const url = pickString(payload.url) || pickString(payload.href);
    if (url) {
        return url;
    }

    const location = pickString(payload.location) || pickString(payload.label) || pickString(payload.name);
    if (location) {
        return location;
    }

    if (Array.isArray(payload.paths)) {
        return summarizeStringCollection('path', payload.paths, false);
    }

    const genericSummary = summarizeGenericPayload(payload);
    if (genericSummary) {
        return genericSummary;
    }

    return phase === 'input' ? undefined : Object.keys(payload).length ? `${toolName} · ${Object.keys(payload).length} field(s)` : toolName;
}

function summarizeGenericPayload(payload: Record<string, any>): string | undefined {
    const preferredKeys = ['path', 'file', 'filePath', 'dir', 'directory', 'from', 'to', 'value', 'text', 'content', 'query', 'input', 'message', 'title', 'label', 'location', 'url', 'href', 'name'];
    for (const key of preferredKeys) {
        const summary = summarizeValue(payload[key], 1);
        if (summary) {
            return summary;
        }
    }

    const entries = Object.entries(payload)
        .map(([key, value]) => ({ key, value: summarizeValue(value, 1) }))
        .filter((entry): entry is { key: string; value: string } => !!entry.value);
    if (!entries.length) {
        return undefined;
    }
    if (entries.length === 1) {
        return entries[0].value;
    }
    return entries.slice(0, 3).map(entry => `${entry.key}=${entry.value}`).join(' · ');
}

function summarizeValue(value: unknown, depth: number): string | undefined {
    if (value == null) {
        return undefined;
    }
    if (typeof value === 'string') {
        const text = value.trim();
        if (!text) {
            return undefined;
        }
        return text.length > 120 ? `${text.slice(0, 120)}...[truncated]` : text;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (Array.isArray(value)) {
        const items = value
            .map(item => summarizeValue(item, Math.max(0, depth - 1)))
            .filter((item): item is string => !!item);
        if (!items.length) {
            return undefined;
        }
        const preview = items.slice(0, 3).join(', ');
        const remaining = items.length > 3 ? ` +${items.length - 3} more` : '';
        return `${preview}${remaining}`;
    }
    if (typeof value === 'object') {
        if (depth <= 0) {
            return undefined;
        }
        const entries = Object.entries(value as Record<string, any>)
            .map(([key, item]) => ({ key, value: summarizeValue(item, depth - 1) }))
            .filter((entry): entry is { key: string; value: string } => !!entry.value);
        if (!entries.length) {
            return undefined;
        }
        if (entries.length === 1) {
            return entries[0].value;
        }
        return entries.slice(0, 3).map(entry => `${entry.key}=${entry.value}`).join(' · ');
    }
    return undefined;
}

function summarizeTodoPayload(payload: Record<string, any>): string | undefined {
    const todos = Array.isArray(payload.todos) ? payload.todos : [];
    const summary = payload.summary && typeof payload.summary === 'object' ? payload.summary : undefined;
    const total = numberOrUndefined(summary?.total) ?? todos.length;
    if (!total && !todos.length) {
        return '0 items';
    }
    const pending = numberOrUndefined(summary?.pending) ?? todos.filter(item => normalizeStatus(item?.status) === 'pending').length;
    const inProgress = numberOrUndefined(summary?.in_progress) ?? todos.filter(item => normalizeStatus(item?.status) === 'in_progress').length;
    const completed = numberOrUndefined(summary?.completed) ?? todos.filter(item => normalizeStatus(item?.status) === 'completed').length;
    const cancelled = numberOrUndefined(summary?.cancelled) ?? todos.filter(item => normalizeStatus(item?.status) === 'cancelled').length;
    const parts = [`${total} item${total === 1 ? '' : 's'}`];
    if (pending) parts.push(`${pending} pending`);
    if (inProgress) parts.push(`${inProgress} in progress`);
    if (completed) parts.push(`${completed} completed`);
    if (cancelled) parts.push(`${cancelled} cancelled`);
    return parts.join(' · ');
}

function summarizeCodingTaskPayload(payload: Record<string, any>): string | undefined {
    const task = payload.task && typeof payload.task === 'object' ? payload.task : undefined;
    const taskResult = task?.result && typeof task.result === 'object' ? task.result : undefined;
    const tasks = Array.isArray(payload.tasks) ? payload.tasks : undefined;
    const workers = Array.isArray(payload.workers) ? payload.workers : Array.isArray(taskResult?.workers) ? taskResult.workers : undefined;
    const report = payload.report && typeof payload.report === 'object'
        ? payload.report
        : taskResult?.report && typeof taskResult.report === 'object'
            ? taskResult.report
            : undefined;
    const reportSummary = summarizeReportSnippet(report);

    if (tasks) {
        return `${tasks.length} task${tasks.length === 1 ? '' : 's'}`;
    }

    if (payload.planned === true || payload.created === true || payload.ran === true || payload.rolledBack === true || payload.cancelled === true) {
        const title = pickString(task?.title) || pickString(task?.id) || pickString(payload.title) || pickString(payload.task_id);
        const stage = payload.planned === true
            ? 'planned'
            : payload.created === true
                ? 'created'
                : payload.ran === true
                    ? `ran${numberOrUndefined(payload.completedActions) != null ? ` · ${payload.completedActions} action${payload.completedActions === 1 ? '' : 's'}` : ''}`
                    : payload.rolledBack === true
                        ? 'rolled back'
                        : 'cancelled';
        return [stage, title].filter(Boolean).join(' · ') || stage;
    }

    if (task) {
        const status = pickString(task.status) || 'task';
        const title = pickString(task.title) || pickString(task.id);
        const actionCount = Array.isArray(task.actions) ? task.actions.length : undefined;
        const parts = [status];
        if (title) parts.push(title);
        if (actionCount != null) parts.push(`${actionCount} action${actionCount === 1 ? '' : 's'}`);
        if (workers?.length) parts.push(`${workers.length} worker${workers.length === 1 ? '' : 's'}`);
        if (reportSummary) parts.push(reportSummary);
        return parts.join(' · ');
    }

    if (workers?.length) {
        return [ `${workers.length} worker${workers.length === 1 ? '' : 's'}`, reportSummary || '' ].filter(Boolean).join(' · ');
    }

    const title = pickString(payload.title) || pickString(payload.goal) || pickString(payload.task_id);
    if (title) {
        return reportSummary ? `${title} · ${reportSummary}` : title;
    }

    return reportSummary || 'coding task';
}

function summarizeSpawnAgentPayload(payload: Record<string, any>): string | undefined {
    const report = payload.report && typeof payload.report === 'object' ? payload.report : undefined;
    const summary = summarizeReportSnippet(report) || pickString(payload.summary) || pickString(payload.output);
    const goal = pickString(payload.goal);
    const sessionId = pickString(payload.sessionId);
    const turnCount = numberOrUndefined(payload.turnCount);
    const toolCalls = numberOrUndefined(payload.toolCalls);

    const parts = [
        goal,
        summary,
        sessionId ? `session=${sessionId}` : '',
        turnCount != null ? `${turnCount} turn${turnCount === 1 ? '' : 's'}` : '',
        toolCalls != null ? `${toolCalls} tool${toolCalls === 1 ? '' : 's'}` : '',
    ].filter(Boolean);

    return parts.length ? parts.join(' · ') : undefined;
}

function summarizeReportSnippet(report: Record<string, any> | undefined): string | undefined {
    if (!report) {
        return undefined;
    }
    const summary = pickString(report.summary);
    const nextSteps = Array.isArray(report.nextSteps) ? report.nextSteps.map(pickString).filter(Boolean) : [];
    const risks = Array.isArray(report.risks) ? report.risks.map(pickString).filter(Boolean) : [];
    const artifacts = Array.isArray(report.artifacts) ? report.artifacts.map(pickString).filter(Boolean) : [];
    const parts = [
        summary,
        nextSteps.length ? `next=${nextSteps.slice(0, 2).join(', ')}` : '',
        risks.length ? `risks=${risks.slice(0, 2).join(', ')}` : '',
        artifacts.length ? `artifacts=${artifacts.slice(0, 2).join(', ')}` : ''
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : undefined;
}

function summarizePathCollection(
    pathValue: unknown,
    items: any[],
    resolveItem: (item: any) => string | undefined,
    truncated: boolean
): string | undefined {
    const path = pickString(pathValue);
    const names = items
        .map(resolveItem)
        .filter((item): item is string => !!item);
    const preview = names.slice(0, 3).join(', ');
    const remaining = names.length > 3 ? ` +${names.length - 3} more` : '';
    const count = `${names.length} ${names.length === 1 ? 'entry' : 'entries'}`;
    const parts = [path, count, preview ? `${preview}${remaining}` : '', truncated ? 'truncated' : '']
        .filter(Boolean);
    return parts.join(' · ') || undefined;
}

function summarizeStringCollection(
    label: string,
    items: any[],
    truncated: boolean
): string | undefined {
    const values = items.map(item => pickString(item)).filter((item): item is string => !!item);
    const preview = values.slice(0, 3).join(', ');
    const remaining = values.length > 3 ? ` +${values.length - 3} more` : '';
    const parts = [`${values.length} ${label}${values.length === 1 ? '' : 's'}`];
    if (preview) {
        parts.push(`${preview}${remaining}`);
    }
    if (truncated) {
        parts.push('truncated');
    }
    return parts.join(' · ');
}

function normalizeToolPayload(value: unknown): Record<string, any> | undefined {
    if (!value) {
        return undefined;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, any>;
    }
    if (typeof value === 'string') {
        const text = value.trim();
        if (!text) {
            return undefined;
        }
        try {
            const parsed = JSON.parse(text);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
        } catch {
            return undefined;
        }
    }
    return undefined;
}

function normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function pickString(value: unknown): string {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function numberOrUndefined(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeStatus(value: unknown): 'pending' | 'in_progress' | 'completed' | 'cancelled' | undefined {
    switch (String(value || '').trim()) {
        case 'pending':
        case 'in_progress':
        case 'completed':
        case 'cancelled':
            return value as any;
        default:
            return undefined;
    }
}
