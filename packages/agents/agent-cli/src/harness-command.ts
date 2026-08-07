import { AGENT_OPTIONS, WeaknessMiner, buildSuggestionHarnessProfilePatch, diffHarnessProfiles, getBuiltinHarnessProfiles, mergeAgentOptions, resolveHarnessProfile, snapshotHarnessProfile } from '@tsdi/agent';
import { AgentCliOptions, resolveCliConfig } from './config';
import { runAgentApplication } from './run-command';

export interface HarnessCliIo {
    stdout?: { write(chunk: string): any };
}

function formatCompactId(id: string): string {
    return id.length > 16 ? `${id.slice(0, 14)}…` : id;
}

function formatProfileView(profile: Record<string, any>, active?: boolean): string {
    const granular = Array.isArray(profile.granularCategories) && profile.granularCategories.length
        ? `  |  granular ${profile.granularCategories.join(', ')}`
        : '';
    const approvalCount = Array.isArray(profile.requireApproval) ? profile.requireApproval.length : 0;
    return `${active ? '* ' : '  '}${profile.name}  |  v${profile.version}  |  approval rules ${approvalCount}  |  repair ${profile.maxRepairRounds ?? '-'}  |  loop-recover ${profile.maxLoopRecoveries ?? '-'}  |  sandbox ${profile.sandbox?.mode ?? '-'}${granular}`;
}

export function formatHarnessProfileList(profiles: Record<string, any>[], current?: string): string {
    const lines: string[] = [];
    lines.push('Harness profiles');
    profiles.forEach(profile => {
        lines.push(formatProfileView(profile, current ? profile.name === current : profile.name === 'default'));
    });
    if (current) {
        lines.push('');
        lines.push(`Active reference: '${current}' (configured via settings.json 'harness.profile' or AgentOptions.harnessProfile)`);
    }
    return lines.join('\n');
}

export function formatHarnessProfileCurrent(profile: Record<string, any> | null | undefined, reference?: string): string {
    if (!profile) {
        return 'No harness profile resolved.';
    }
    const lines: string[] = [];
    lines.push(`Harness profile ${profile.name}  |  v${profile.version}${reference ? `  |  reference '${reference}'` : ''}`);
    const rules = Array.isArray(profile.requireApproval) ? profile.requireApproval : [];
    lines.push('Approval rules:');
    if (!rules.length) {
        lines.push('- none');
    } else {
        rules.forEach((rule: any) => {
            const category = typeof rule === 'string'
                ? rule
                : `${rule.category}${Array.isArray(rule.names) && rule.names.length ? `:${rule.names.join(',')}` : ''}${rule.mode ? ` [${rule.mode}]` : ''}`;
            lines.push(`- ${category}`);
        });
    }
    if (profile.sandbox) {
        const allow = Array.isArray(profile.sandbox.networkAllowlist) && profile.sandbox.networkAllowlist.length
            ? `  |  allow ${profile.sandbox.networkAllowlist.join(', ')}`
            : '';
        lines.push(`Sandbox: ${profile.sandbox.mode}${allow}`);
    }
    if (profile.maxRepairRounds !== undefined) {
        lines.push(`Max repair rounds: ${profile.maxRepairRounds}`);
    }
    if (profile.maxLoopRecoveries !== undefined) {
        lines.push(`Max loop recoveries: ${profile.maxLoopRecoveries}`);
    }
    if (Array.isArray(profile.verificationWriteTools) && profile.verificationWriteTools.length) {
        lines.push(`Verification write tools: ${profile.verificationWriteTools.join(', ')}`);
    }
    return lines.join('\n');
}

export function formatHarnessProfileDiff(from: string, to: string, diff: string[]): string {
    const lines: string[] = [];
    lines.push(`Harness profile diff ${from} -> ${to}`);
    if (!diff.length) {
        lines.push('(no differences)');
    } else {
        diff.forEach(line => lines.push(`  ${line}`));
    }
    return lines.join('\n');
}

/**
 * Lists the builtin harness profiles and resolves the effective profile from
 * settings.json / AgentOptions. Does not boot the application runtime.
 */
export function runAgentHarnessProfileList(options: AgentCliOptions & { json?: boolean }, io: HarnessCliIo = {}): Record<string, any> {
    const stdout = io.stdout || process.stdout;
    const registry = getBuiltinHarnessProfiles();
    const profiles = Object.values(registry);
    const resolved = resolveCliConfig(options);
    const current = typeof resolved.harnessProfile === 'string' && resolved.harnessProfile.trim()
        ? resolved.harnessProfile.trim()
        : undefined;
    const result = { profiles, current };
    stdout.write(options.json
        ? JSON.stringify(result, null, 2) + '\n'
        : formatHarnessProfileList(profiles as Record<string, any>[], current) + '\n');
    return result;
}

/**
 * Shows the effective harness profile (builtin reference or live snapshot of
 * the merged AgentOptions). Boots the runtime like `harness audit` so the
 * live options are authoritative.
 */
export async function runAgentHarnessProfileCurrent(options: AgentCliOptions & { json?: boolean }, io: HarnessCliIo = {}): Promise<Record<string, any> | null> {
    const stdout = io.stdout || process.stdout;
    const resolved = resolveCliConfig(options);
    const reference = typeof resolved.harnessProfile === 'string' && resolved.harnessProfile.trim()
        ? resolved.harnessProfile.trim()
        : undefined;
    const ctx = await runAgentApplication(options, mergeAgentOptions({ harnessProfile: resolved.harnessProfile }));
    try {
        const appOptions = ctx.get(AGENT_OPTIONS);
        const merged = mergeAgentOptions(appOptions ?? {});
        const profile = resolveHarnessProfile(merged.harnessProfile as any) ?? snapshotHarnessProfile(merged, reference ?? 'default');
        stdout.write(options.json
            ? JSON.stringify(profile, null, 2) + '\n'
            : formatHarnessProfileCurrent(profile as Record<string, any>, reference) + '\n');
        return profile as Record<string, any>;
    } finally {
        await ctx.close();
    }
}

/**
 * Diffs two harness profiles. `from`/`to` accept a builtin name or `current`
 * (the live merged options snapshot).
 */
export async function runAgentHarnessProfileDiff(from: string, to: string, options: AgentCliOptions & { json?: boolean }, io: HarnessCliIo = {}): Promise<Record<string, any>> {
    const stdout = io.stdout || process.stdout;
    const registry = getBuiltinHarnessProfiles();
    const resolved = resolveCliConfig(options);
    const ctx = await runAgentApplication(options, mergeAgentOptions({ harnessProfile: resolved.harnessProfile }));
    try {
        const appOptions = ctx.get(AGENT_OPTIONS);
        const merged = mergeAgentOptions(appOptions ?? {});
        const snapshotCurrent = snapshotHarnessProfile(merged, 'current');
        const fromProfile = from === 'current' ? snapshotCurrent : registry[from];
        const toProfile = to === 'current' ? snapshotCurrent : registry[to];
        if (!fromProfile || !toProfile) {
            const unknown = !fromProfile ? from : to;
            const message = `Unknown harness profile: '${unknown}'. Available: default, strict, current.`;
            stdout.write(options.json
                ? JSON.stringify({ error: message }, null, 2) + '\n'
                : message + '\n');
            return { error: message };
        }
        const diff = diffHarnessProfiles(fromProfile, toProfile);
        const result = { from, to, diff };
        stdout.write(options.json
            ? JSON.stringify(result, null, 2) + '\n'
            : formatHarnessProfileDiff(from, to, diff) + '\n');
        return result;
    } finally {
        await ctx.close();
    }
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

export async function runAgentHarnessAudit(options: AgentCliOptions & { json?: boolean; session?: string; profilePatch?: boolean }, io: HarnessCliIo = {}): Promise<Record<string, any> | null> {
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
        const patch = buildSuggestionHarnessProfilePatch(report.suggestions);
        const result = { ...report, profilePatch: patch };
        stdout.write(options.json
            ? JSON.stringify(result, null, 2) + '\n'
            : options.profilePatch
                ? formatHarnessAuditReport(result as Record<string, any>) + '\n\n' + formatHarnessProfilePatchView(patch.profile, patch.changes) + '\n'
                : formatHarnessAuditReport(report as Record<string, any>) + '\n');
        return result as Record<string, any>;
    } finally {
        await ctx.close();
    }
}

export function formatHarnessProfilePatchView(profile: Record<string, any>, changes: string[]): string {
    const lines: string[] = [];
    lines.push('Suggested harness profile patch:');
    if (!changes.length) {
        lines.push('- no governance changes implied by these suggestions');
        return lines.join('\n');
    }
    changes.forEach(line => lines.push(`- ${line}`));
    lines.push('');
    lines.push(`Resulting profile: ${profile.name}  |  v${profile.version}  |  approval rules ${Array.isArray(profile.requireApproval) ? profile.requireApproval.length : 0}  |  repair ${profile.maxRepairRounds ?? '-'}  |  loop-recover ${profile.maxLoopRecoveries ?? '-'}  |  sandbox ${profile.sandbox?.mode ?? '-'}`);
    return lines.join('\n');
}
