import { WeaknessMiner } from '@tsdi/agent';
import { AgentCliOptions } from './config';
import { runAgentApplication } from './run-command';

export interface HarnessCliIo {
    stdout?: { write(chunk: string): any };
}

function formatCompactId(id: string): string {
    return id.length > 16 ? `${id.slice(0, 14)}…` : id;
}

export function formatHarnessAuditReport(report: Record<string, any>): string {
    const lines: string[] = [];
    const scope = Array.isArray(report.scopedSessionIds) && report.scopedSessionIds.length
        ? report.scopedSessionIds.map((id: string) => formatCompactId(id)).join(', ')
        : 'all sessions';
    lines.push('Harness failure-pattern audit');
    lines.push(`Scope: ${scope}`);
    lines.push(`Turns: ${Number(report.totalTurns ?? 0)}  |  Tool attempts: ${Number(report.totalToolAttempts ?? 0)}  |  Fail-turn rate: ${Number(report.failureTurnRate ?? 0)}%`);
    lines.push('');
    lines.push('Top failing tools:');
    const toolStats = Array.isArray(report.topFailingTools) ? report.topFailingTools : [];
    if (!toolStats.length) {
        lines.push('- none');
    } else {
        toolStats.forEach((stat: Record<string, any>) => {
            lines.push(`- ${stat.toolName}: ${stat.failures}/${stat.attempts} (${Number(stat.failureRate ?? 0)}%)  |  falsified ${Number(stat.falsifiedCount ?? 0)}`);
        });
    }
    lines.push('');
    lines.push('Error-signature clusters:');
    const clusters = Array.isArray(report.errorClusters) ? report.errorClusters : [];
    if (!clusters.length) {
        lines.push('- none');
    } else {
        clusters.forEach((cluster: Record<string, any>) => {
            const tools = Array.isArray(cluster.toolNames) ? cluster.toolNames.join(', ') : '';
            lines.push(`- ${cluster.signature}: x${cluster.count}  |  tools ${tools}${cluster.suggestedPolicy ? `  |  ${cluster.suggestedPolicy}` : ''}`);
        });
    }
    lines.push('');
    lines.push('Falsified distribution:');
    const falsified = Array.isArray(report.falsifiedDistribution) ? report.falsifiedDistribution : [];
    if (!falsified.length) {
        lines.push('- none');
    } else {
        falsified.forEach((entry: Record<string, any>) => {
            lines.push(`- ${entry.toolName}: ${entry.falsifiedCount} (${Number(entry.falsifiedRate ?? 0)}%)`);
        });
    }
    lines.push('');
    lines.push('Suggestions:');
    const suggestions = Array.isArray(report.suggestions) ? report.suggestions : [];
    if (!suggestions.length) {
        lines.push('- none');
    } else {
        suggestions.forEach((suggestion: Record<string, any>) => {
            const target = suggestion.toolName ? ` ${suggestion.toolName}` : '';
            lines.push(`- [${suggestion.kind}]${target}: ${suggestion.message}`);
        });
    }
    return lines.join('\n');
}

export async function runAgentHarnessAudit(options: AgentCliOptions & { json?: boolean; session?: string }, io: HarnessCliIo = {}): Promise<Record<string, any> | null> {
    const stdout = io.stdout || process.stdout;
    const ctx = await runAgentApplication(options, {});
    try {
        const miner = ctx.get(WeaknessMiner);
        const sessionId = typeof options.session === 'string' && options.session.trim()
            ? options.session.trim()
            : undefined;
        const report = await miner.mine({ sessionIds: sessionId ? [sessionId] : undefined });
        if (!report || report.empty === true) {
            stdout.write(sessionId
                ? `No harness failure data recorded for session '${sessionId}'.\n`
                : 'No harness failure data recorded yet.\n');
            return report ?? null;
        }
        stdout.write(options.json
            ? JSON.stringify(report, null, 2) + '\n'
            : formatHarnessAuditReport(report as Record<string, any>) + '\n');
        return report as Record<string, any>;
    } finally {
        await ctx.close();
    }
}
