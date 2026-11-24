import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';
import type { CommandHandlerContext } from './AgentConsoleCommandHandlers';

export interface AgentConsoleArtifactFile {
    path: string;
    toolName?: string;
    timestamp?: number;
}

export interface AgentConsoleArtifactReport {
    taskId: string;
    goal: string;
    artifacts: string[];
}

export interface AgentConsoleArtifactsHost {
    translator?: AgentUiTranslator | null;
    state: { sessionId: string; openTextOverlay(title: string, lines: string[], visibleLines?: number): void };
    runtime?: { listFileSnapshots?(sessionId: string): Array<Record<string, any>> } | null;
    appRpc?: { request(method: string, params?: any, context?: any): Promise<any> } | null;
    sessionService?: {
        listAllBackgroundTasks?(options: { sessionId?: string }, context?: any): Promise<Array<Record<string, any>>>;
    } | null;
    notify(message: string): void;
    rpcRequestContext?(): any;
}

/** Unique touched files from file snapshots (multi-file patches included). */
export function collectArtifactFiles(snapshots: Array<Record<string, any>> = []): AgentConsoleArtifactFile[] {
    const files = new Map<string, AgentConsoleArtifactFile>();
    const add = (entry: Record<string, any>) => {
        const path = String(entry?.filePath || entry?.path || '').trim();
        if (!path) {
            return;
        }
        const current = files.get(path);
        const timestamp = Number(entry?.timestamp) || 0;
        if (!current || timestamp >= (current.timestamp || 0)) {
            files.set(path, {
                path,
                toolName: entry?.toolName ? String(entry.toolName) : current?.toolName,
                timestamp
            });
        }
    };
    for (const snapshot of snapshots) {
        add(snapshot);
        if (Array.isArray(snapshot?.files)) {
            snapshot.files.forEach(add);
        }
    }
    return [...files.values()].sort((left, right) => (right.timestamp || 0) - (left.timestamp || 0));
}

/** Worker report artifacts (string or string[] under result/report). */
export function collectArtifactReports(tasks: Array<Record<string, any>> = []): AgentConsoleArtifactReport[] {
    const reports: AgentConsoleArtifactReport[] = [];
    for (const task of tasks) {
        const raw = task?.result?.report?.artifacts ?? task?.result?.artifacts;
        const items = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
        const artifacts = items.map(item => String(item || '').trim()).filter(Boolean);
        if (!artifacts.length) {
            continue;
        }
        reports.push({
            taskId: String(task?.id || ''),
            goal: String(task?.goal || task?.title || ''),
            artifacts
        });
    }
    return reports;
}

export async function runArtifactsCommand(host: AgentConsoleArtifactsHost): Promise<void> {
    let snapshots: Array<Record<string, any>> = [];
    try {
        if (host.appRpc) {
            const result = await host.appRpc.request('session.file_snapshot.list', { sessionId: host.state.sessionId }, host.rpcRequestContext?.());
            snapshots = Array.isArray(result?.snapshots) ? result.snapshots : Array.isArray(result) ? result : [];
        } else {
            snapshots = host.runtime?.listFileSnapshots?.(host.state.sessionId) || [];
        }
    } catch {
        snapshots = [];
    }
    let published: Array<Record<string, any>> = [];
    if (host.appRpc) {
        const result = await host.appRpc.request('artifact.list', { sessionId: host.state.sessionId }, host.rpcRequestContext?.())
            .catch(() => null);
        published = Array.isArray(result?.artifacts) ? result.artifacts : [];
    }
    const tasks = await host.sessionService?.listAllBackgroundTasks?.({ sessionId: host.state.sessionId }, host.rpcRequestContext?.())
        .catch(() => []) || [];
    const files = collectArtifactFiles(snapshots);
    const reports = collectArtifactReports(tasks);
    if (!files.length && !reports.length && !published.length) {
        host.notify(formatAgentUiNotice(host.translator, 'artifactsEmpty'));
        return;
    }
    const lines: string[] = [];
    if (published.length) {
        lines.push(formatAgentUiNotice(host.translator, 'artifactsPublishedHeading', { count: published.length }));
        published.forEach(artifact => {
            lines.push(`  ${artifact.title || artifact.id} · ${artifact.id} · ${artifact.entry}`);
        });
    }
    if (files.length) {
        lines.push(formatAgentUiNotice(host.translator, 'artifactsFilesHeading', { count: files.length }));
        files.forEach(file => lines.push(`  ${file.path}${file.toolName ? ` · ${file.toolName}` : ''}`));
    }
    if (reports.length) {
        lines.push(formatAgentUiNotice(host.translator, 'artifactsReportsHeading', { count: reports.length }));
        reports.forEach(report => {
            lines.push(`  ${report.goal || report.taskId}`);
            report.artifacts.forEach(artifact => lines.push(`    ${artifact}`));
        });
    }
    host.state.openTextOverlay(
        formatAgentUiNotice(host.translator, 'artifactsTitle'),
        lines,
        Math.min(24, Math.max(3, lines.length))
    );
}

/** Command-context adapter for `/artifacts`. */
export function artifactsCommandHost(ctx: CommandHandlerContext): AgentConsoleArtifactsHost {
    return {
        translator: ctx.translator,
        state: ctx.state,
        runtime: ctx.runtime as any,
        appRpc: ctx.appRpc as any,
        sessionService: ctx.sessionService as any,
        notify: (message: string) => ctx.notify(message),
        rpcRequestContext: () => ctx.rpcRequestContext?.()
    };
}
