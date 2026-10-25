import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { agentUiChinese, agentUiEnglish } from '../src/agent-ui.i18n';
import { buildAgentConsoleHelpOptions } from '../src/AgentConsoleCommandRegistry';
import { runStatusCommand, runTitleCommand } from '../src/AgentConsoleRuntimeCommands';
import {
    AgentConsoleCommandOutputsPanelComponent,
    AgentConsoleJobsPanelComponent,
    AgentConsolePendingQuestionPanelComponent,
    AgentConsoleSessionsPanelComponent,
    AgentConsoleTextOverlayPanelComponent,
    AgentConsoleWhichKeyPanelComponent,
    AgentConsoleWorkingPanelComponent
} from '../src/AgentConsolePanels';
import {
    buildSummaryQualityRecordOption,
    formatCompactionHistoryAggregate,
    formatCompactionHistoryRecord,
    formatSummaryQualityAggregate,
    formatTurnDiagnosticsAggregate,
    formatTurnDiagnosticsTrend,
    formatUsageSummary
} from '../src/AgentConsoleFormatters';
import {
    formatSummaryQualityTrend,
    openTurnDiagnosticsListView,
    openSummaryQualityTrendView,
    refreshSummaryQualityDigest,
    refreshUsageDigest
} from '../src/AgentConsoleDiagnosticsView';
import { openHarnessAudit, openHarnessProfile } from '../src/AgentConsoleDiagnosticsHandlers';
import { runBackgroundTasksCommandView } from '../src/AgentConsoleBackgroundTaskCommands';
import { runIdeCommand } from '../src/AgentConsoleIdeCommands';
import { runQueueCommand } from '../src/AgentConsoleRpcCommands';
import { runStashCommand } from '../src/AgentConsoleStashCommands';
import { handleVoiceCommand } from '../src/AgentConsoleVoiceHandlers';
import { openApprovalInspector } from '../src/AgentConsoleApprovalCommands';
import { AgentConsoleInputPanelComponent } from '../src/AgentConsolePanels';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { describePendingAttachments } from '../src/AgentConsoleExportHandlers';
import { collectHealthItems } from '../src/AgentConsoleHealthView';
import { parseAgentConsoleCommandArguments, formatAgentConsoleCommandDiagnosticEcho, getAgentConsoleCommandDefinition } from '../src/AgentConsoleCommandRegistry';
import { describeWorktreeDiffScope, parseWorktreeDiffArgs } from '../src/AgentConsoleReviewHandlers';
import { openGitSnapshotDiff, runGitSnapshotsCommand } from '../src/AgentConsoleGitSnapshotCommands';
import { runDebugConfigCommand, runMemoriesCommand, runPersonalityCommand } from '../src/AgentConsolePreferenceCommands';
import { runAppsCommand } from '../src/AgentConsoleExtensionCommands';
import { AgentConsoleComponent } from '../src/AgentConsoleComponent';
import { createConsole, RuntimeStub, SchedulerStub } from './_helpers';
import { renderAgentConsoleMessageItems } from '../src/AgentConsoleMessageRenderers';

function translateFrom(bundle: typeof agentUiEnglish) {
    return (key: string, params?: Record<string, any>) => {
        const parts = key.split('.');
        let current: any = bundle.messages;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return key;
            }
        }
        if (typeof current !== 'string') {
            return key;
        }
        return current.replace(/\{(\w+)\}/g, (_m, name: string) => String(params?.[name] ?? ''));
    };
}

const zh = { translate: translateFrom(agentUiChinese as any) } as any;
const en = { translate: translateFrom(agentUiEnglish as any) } as any;

function state(overrides: Record<string, any> = {}): any {
    return {
        consoleOptions: {
            sessionsVisibleItems: 10,
            reviewDetailVisibleLines: 20
        },
        ...overrides
    };
}

/**
 * Real TUI finding: after the command menus were translated, the panel chrome
 * (session list headers, jobs/tool-run summaries, overlay titles and hints,
 * pending-question copy, keymap overlay) and the `/help` subcommand rows still
 * rendered English. They now resolve through `agent.menu.panel.*` with the
 * English copy as fallback.
 */
@Suite('panel chrome is localized')
export class PanelI18nTest {
    @Test('session list summary, current marker and project header are localized')
    async sessionsPanelLocalized() {
        const base = state({
            sessionsFocused: true,
            selectedSessionId: 's1',
            navFilteredSessions: [
                { id: 's1', title: 'first', workspace: '/tmp/ws', current: true, messageCount: 3, projectKey: 'p1', projectLabel: 'ws', projectSessionCount: 2 },
                { id: 's2', title: 'second', workspace: '/tmp/ws', current: false, messageCount: 1, projectKey: 'p1', projectLabel: 'ws', projectSessionCount: 2 }
            ]
        });
        const panel = new AgentConsoleSessionsPanelComponent(base, zh);
        expect(panel.sessionsSummaryLabel).toEqual('会话 2 · 1/2');
        expect(panel.sessionItems[0].label).toContain('项目 ws · 2 个会话');
        expect(panel.sessionItems[1].label).toContain('first [当前] (3)');
    }

    @Test('jobs panel summary and empty hint are localized')
    async jobsPanelLocalized() {
        const panel = new AgentConsoleJobsPanelComponent(state({ jobsFocused: true, scheduledTasks: [] }), zh);
        expect(panel.jobsSummaryLabel).toEqual('定时任务 0');
        expect(panel.jobListLines).toEqual(['暂无定时任务']);
        expect(panel.jobsHintLabel).toEqual('暂无定时任务   使用 schedulePrompt 创建');
    }

    @Test('text overlay title and hint are localized')
    async overlayPanelLocalized() {
        const base = state({
            textOverlay: { title: 'Diff', lines: ['a', 'b', 'c'], scroll: 1 },
            hasTextOverlayFocus: () => true
        });
        const panel = new AgentConsoleTextOverlayPanelComponent(base, zh);
        expect(panel.overlayTitle).toEqual('Diff 3 行 · 2-3');
        expect(panel.hintLabel).toEqual('esc 关闭 · ↑↓ 滚动');
    }

    @Test('command output panel copy is localized')
    async commandOutputsPanelLocalized() {
        const base = state({
            commandOutputs: [],
            visibleCommandOutputs: [],
            commandOutputsSelectedIndex: 0,
            hasCommandOutputsFocus: () => true
        });
        const panel = new AgentConsoleCommandOutputsPanelComponent(base, zh);
        expect(panel.panelTitle).toEqual('命令结果 0 · 0-0');
        expect(panel.emptyLabel).toEqual('暂无命令结果。');
        expect(panel.hintLabel).toEqual('esc 关闭 · ↑↓/jk 移动 · / 过滤 · 回车 复制');
    }

    @Test('pending question header and hints are localized')
    async pendingQuestionLocalized() {
        const base = state({
            pendingQuestion: { question: '继续吗？', options: ['是', '否'], expiresAt: Date.now() + 90 * 60 * 1000 },
            pendingQuestionTotal: 2,
            pendingQuestionSelectedIndex: 0,
            questionAction: 'answer',
            input: ''
        });
        const panel = new AgentConsolePendingQuestionPanelComponent(base, zh);
        expect(panel.pendingQuestionHeader).toEqual('等待你的回答 · 2 个排队');
        expect(panel.pendingQuestionExpiryHint).toEqual('1 小时 30 分钟后过期');
        expect(panel.pendingQuestionSelectionHint).toContain('已选 1/2');
        expect(panel.pendingQuestionCustomHint).toEqual('或输入你自己的回答，然后按回车');
    }

    @Test('keymap overlay title, hints and groups are localized')
    async whichKeyPanelLocalized() {
        const base = state({
            whichKeyBindings: [
                { key: 'ctrl+x g', action: 'timeline-mode' },
                { key: 'ctrl+t', action: 'new-session' }
            ],
            whichKeyLayout: 'grouped',
            whichKeyPage: 0,
            whichKeyFilterCustom: false
        });
        const panel = new AgentConsoleWhichKeyPanelComponent(base, zh);
        expect(panel.titleText).toEqual('按键映射（2） 分组');
        expect(panel.hintText).toEqual('esc 关闭 · n 下一页 · L 布局 · F 过滤');
        expect(panel.groupedBindings.map(group => group.label)).toEqual(['显示', '会话']);
    }

    @Test('/help subcommand rows and @workspace resolve translated keys')
    async helpSubcommandLocalized() {
        const options = buildAgentConsoleHelpOptions((key, fallback) => {
            const value = zh.translate(key);
            return value && value !== key ? value : fallback;
        });
        expect(options.find(option => option.value === '/keymap list')?.description).toEqual('列出某个上下文的按键绑定');
        expect(options.find(option => option.value === '@workspace')?.description).toEqual('上下文');
    }

    @Test('scheduled job detail rows are localized')
    async jobsDetailLocalized() {
        const job = {
            id: 'j1', sessionId: 's1', scheduleType: 'once', paused: true, prompt: 'ping',
            runCount: 2, failureCount: 1, manualRecoveryRequired: true, alertOnFailure: true, lastError: 'boom'
        };
        const base = state({
            jobsFocused: true,
            scheduledTasks: [job],
            selectedScheduledTask: job,
            selectedScheduledTaskId: 'j1'
        });
        const panel = new AgentConsoleJobsPanelComponent(base, zh);
        expect(panel.selectedJobDetailLabel.split('\n')).toEqual([
            '会话 s1',
            '调度 once',
            '状态 已暂停',
            '提示 ping',
            '运行次数 2',
            '失败次数 1',
            '需要手动恢复',
            '失败时告警',
            '最后错误 boom'
        ]);
    }

    @Test('/status report, overlay title and lines are localized')
    async statusCommandLocalized() {
        const outputs: Array<{ command: string; text: string }> = [];
        let overlay: { title: string; lines: string[] } | null = null;
        const host: any = {
            translator: zh,
            state: {
                sessionId: 's1',
                modelProfile: 'deepseek-v4-flash',
                planMode: false,
                openTextOverlay: (title: string, lines: string[]) => { overlay = { title, lines }; }
            },
            pushCommandOutput: (command: string, text: string) => { outputs.push({ command, text }); },
            getSessionSandboxMode: async () => 'default',
            getSessionDelegationMode: async () => 'explicit'
        };
        await runStatusCommand(host);
        expect(outputs[0].text).toContain('会话 s1');
        expect(outputs[0].text).toContain('计划模式 关');
        expect(overlay!.title).toEqual('状态');
        expect(overlay!.lines).toEqual([
            '会话：s1',
            '模型：deepseek-v4-flash',
            '原型：build',
            '计划模式：关',
            '沙箱：default',
            '委托：explicit'
        ]);
    }

    @Test('English fallback keeps the previous panel copy')
    async englishPanelFallback() {
        const base = state({ jobsFocused: true, scheduledTasks: [] });
        const panel = new AgentConsoleJobsPanelComponent(base, en);
        expect(panel.jobsSummaryLabel).toEqual('jobs 0');
        expect(panel.jobListLines).toEqual(['no scheduled jobs']);
        expect(panel.jobsHintLabel).toEqual('no scheduled jobs   use schedulePrompt');
    }
    @Test('/usage windows are localized while the English default is unchanged')
    async usageSummaryLocalized() {
        const usage = {
            daily: { turns: 3, promptTokens: 41800, completionTokens: 1800, totalTokens: 43500 },
            weekly: { turns: 21, promptTokens: 354000, completionTokens: 4700, totalTokens: 358700 },
            cumulative: { turns: 96, promptTokens: 1700000, completionTokens: 21200, totalTokens: 1700000 }
        };
        expect(formatUsageSummary(usage, zh)).toEqual(
            '今天 3 轮 · 输入 41.8K · 输出 1.8K · 合计 43.5K | 本周 21 轮 · 输入 354K · 输出 4.7K · 合计 358.7K | 全部 96 轮 · 输入 1.7M · 输出 21.2K · 合计 1.7M'
        );
        expect(formatUsageSummary({ selectedRange: 'weekly', selected: usage.weekly }, zh)).toEqual(
            '本周 21 轮 · 输入 354K · 输出 4.7K · 合计 358.7K'
        );
        expect(formatUsageSummary(usage)).toContain('day 3 turns');
        expect(formatUsageSummary(usage)).toContain('all 96 turns');
    }

    @Test('usage digest load and dashboard prefix are localized')
    async usageDigestLocalized() {
        const digestState: any = { setUsageDigest(value: string) { this.usageDigest = value; } };
        await refreshUsageDigest(
            { getUsageStats: async () => ({ daily: { turns: 1, totalTokens: 9 }, cumulative: { turns: 1, totalTokens: 9 } }) },
            digestState,
            zh
        );
        expect(digestState.usageDigest).toContain('今天 1 轮');
        const panel = new AgentConsoleWorkingPanelComponent(state({ status: 'running', usageDigest: digestState.usageDigest }), zh);
        expect(panel.dashboardUsageLabel).toEqual(`用量 · ${digestState.usageDigest}`);
    }

    @Test('/debug-config header, state words and session line are localized')
    async debugConfigLocalized() {
        const outputs: Array<{ command: string; text: string }> = [];
        const host: any = {
            translator: zh,
            options: {
                model: { provider: 'deepseek', model: 'deepseek-v4-flash', defaultProfile: 'fast', profiles: { fast: {}, strong: {} } },
                ui: { title: 'tsdi-agent', memoryInjection: true }
            },
            state: { sessionId: 's1', modelProfile: 'fast' },
            workspace: '/tmp/opencode/zh-ws2',
            notify() { /* not used */ },
            pushCommandOutput: (command: string, text: string) => { outputs.push({ command, text }); },
            rpcRequestContext: () => ({})
        };
        await runDebugConfigCommand(host);
        expect(outputs[0].command).toEqual('/debug-config');
        const lines = outputs[0].text.split('\n');
        expect(lines[0]).toEqual('调试配置：');
        expect(lines[2]).toEqual('profile: fast（可用：fast, strong）');
        expect(lines[3]).toEqual('ui.title: tsdi-agent');
        expect(lines[4]).toEqual('ui.statusline: （默认）');
        expect(lines[5]).toEqual('ui.memoryInjection: 开启');
        expect(lines[6]).toEqual('ui.personality: 无');
        expect(lines[7]).toEqual('ui.queueMode: 关闭');
        expect(lines[10]).toEqual('会话：s1 · 工作区：/tmp/opencode/zh-ws2');
    }

    @Test('/memories and /personality state words are localized')
    async preferenceStateWordsLocalized() {
        const notices: string[] = [];
        const host: any = {
            translator: zh,
            options: { ui: {} },
            state: { sessionId: 's1', projectKey: '' },
            workspace: '/tmp/ws',
            runtime: {},
            notify: (message: string) => notices.push(message),
            pushCommandOutput() { /* not used */ },
            rpcRequestContext: () => ({})
        };
        await runMemoriesCommand(host);
        expect(notices[0]).toContain('记忆注入 开启');
        await runPersonalityCommand(host);
        expect(notices[1]).toContain('人格：无');
    }

    @Test('/apps rows localize the category word and keep descriptions verbatim')
    async appsCategoryLocalized() {
        let title = '';
        let options: any[] = [];
        const host: any = {
            translator: zh,
            options: { ui: {} },
            state: {},
            notify() { /* not used */ },
            select: async (menuTitle: string, menuOptions: any[]) => { title = menuTitle; options = menuOptions; return undefined; },
            pushCommandOutput() { /* not used */ },
            invokeTool: async () => ({})
        };
        await runAppsCommand(host);
        expect(title).toEqual('应用');
        expect(options.find(option => option.value === 'github').description)
            .toEqual('代码 · Repositories, issues, pull requests, and actions');
        expect(options.find(option => option.value === 'slack').description)
            .toEqual('消息 · Channels, threads, and messages');
    }

    @Test('shell and git-snapshot command hosts forward the console translator')
    async commandHostsForwardTranslator() {
        const fake: any = Object.create(AgentConsoleComponent.prototype);
        fake.state = { sessionId: 's1' };
        fake.sessionService = { listGitStepSnapshots: async () => [] };
        fake.translator = zh;
        expect(fake.gitSnapshotCommandHost().translator).toBe(zh);
        expect(fake.shellCommandHost().translator).toBe(zh);
    }
    @Test('quality and compaction digests are localized')
    async digestFormattersLocalized() {
        const quality = formatSummaryQualityAggregate(
            { provider: 'deepseek', recordCount: 12, avgTotal: 84.2, fallbackRate: 8.3, avgEvidenceCoverage: 67.5, timeRange: {} },
            zh
        );
        expect(quality).toEqual('deepseek · 12 条摘要记录 · 平均 84.2 · 回退 8.3% · 证据 67.5%');
        expect(formatSummaryQualityAggregate({ provider: 'deepseek', recordCount: 1, avgTotal: 84.2, fallbackRate: 8.3, avgEvidenceCoverage: 67.5, timeRange: {} }))
            .toEqual('deepseek · 1 summary record · avg 84.2 · fallback 8.3% · evidence 67.5%');

        expect(formatCompactionHistoryAggregate(
            { sessionId: 'session-1', recordCount: 2, compactedCount: 1, totalTokensSaved: 12500, avgCompressionRatio: 62.5, timeRange: {} },
            zh
        )).toEqual('session-1 · 2 次压缩 · 触发 1 次 · 节省 12.5K tokens · 平均 62.5%');

        const digestState: any = { setSummaryQualityDigest(value: string) { this.digest = value; } };
        await refreshSummaryQualityDigest(
            { getSummaryQualityStats: async () => [{ provider: 'deepseek', recordCount: 12, avgTotal: 84.2, fallbackRate: 8.3, avgEvidenceCoverage: 67.5, timeRange: {} }] },
            digestState,
            zh
        );
        expect(digestState.digest).toContain('12 条摘要记录');
        const panel = new AgentConsoleWorkingPanelComponent(state({ status: 'running', summaryQualityDigest: digestState.digest }), zh);
        expect(panel.dashboardQualityLabel).toContain('质量 · ');
    }

    @Test('compaction records and turn diagnostics are localized')
    async compactionAndTurnFormattersLocalized() {
        expect(formatCompactionHistoryRecord({
            compactionTriggered: true, level: 3, beforeMessageCount: 20, afterMessageCount: 10,
            compactedMessageCount: 10, beforeTokens: 4000, afterTokens: 2000, compressionRatio: 50, cumulativeTokenSavings: 5000
        }, zh)).toEqual('已压缩 · L3 · 20→10 条消息（10） · 4K→2K tokens（50%） · 累计节省 5K');

        expect(formatTurnDiagnosticsAggregate(
            { totalTurns: 12, emptyResponseRate: 8.3, repeatedQuestionRate: 16.7, clarificationRate: 0, compactionCount: 3, totalTokenSavings: 25000 },
            undefined,
            zh
        )).toEqual('全部会话 · 12 轮 · 空回复 8.3% · 重复 16.7% · 澄清 0% · 压缩 3 次 · 节省 25K tokens');

        const trend = formatTurnDiagnosticsTrend([
            { sessionId: 'session-1', bucketStart: Date.parse('2026-01-01'), recordCount: 4, totalTokenSavings: 2000 },
            { sessionId: 'session-1', bucketStart: Date.parse('2026-01-02'), recordCount: 3, totalTokenSavings: 3000 }
        ], zh);
        expect(trend[0]).toContain('session-1');
        expect(trend[0]).toContain('2天');
        expect(trend[0]).toContain('7 轮');
        expect(trend[0]).toContain('节省 5K tokens');
    }

    @Test('quality trend view and record options are localized')
    async qualityTrendAndRecordsLocalized() {
        const outputs: string[] = [];
        await openSummaryQualityTrendView(
            { getSummaryQualityTrend: async () => [
                { provider: 'deepseek', bucketStart: Date.parse('2026-01-01'), avgTotal: 82.5, fallbackRate: 1, avgEvidenceCoverage: 70 },
                { provider: 'deepseek', bucketStart: Date.parse('2026-01-02'), avgTotal: 84, fallbackRate: 2, avgEvidenceCoverage: 71 }
            ] },
            () => { /* unused */ },
            (_command: string, text: string) => { outputs.push(text); },
            'deepseek', undefined, undefined, zh
        );
        expect(outputs[0]).toContain('deepseek');
        expect(outputs[0]).toContain('2天');
        expect(outputs[0]).toContain('平均 83.3');
        expect(outputs[0]).toContain('证据 70.5%');

        expect(formatSummaryQualityTrend([{ provider: 'deepseek', bucketStart: 1, avgTotal: 82.5 }]).length).toEqual(1);

        const option = buildSummaryQualityRecordOption({
            id: 'q1', provider: 'deepseek', model: 'deepseek-v4-flash', total: 92, createdAt: 1,
            fieldCompleteness: 3, annotationQuality: 4, lengthBalance: 5, truncationScore: 6,
            evidenceCoverage: 88.5, fallbackUsed: true, summaryLength: 120
        }, zh);
        expect(option.label).toEqual('deepseek · deepseek-v4-flash · 92');
        expect(option.description).toContain('字段 3');
        expect(option.description).toContain('证据 88.5%');
        expect(option.description).toContain('回退');
        expect(option.detail).toContain('记录：q1');
        expect(option.detail).toContain('回退：是');
    }

    @Test('/diagnostics list rows and title are localized')
    async turnDiagnosticsListLocalized() {
        let title = '';
        let hint = '';
        let options: any[] = [];
        await openTurnDiagnosticsListView(
            { listTurnDiagnostics: async () => [{
                id: 'r1', sessionId: 'session-1', createdAt: 1, compactionCount: 2, totalTokenSavings: 4000,
                repeatedClarificationDetected: true, finalAssistantWasClarification: false, compactionLevel: 'L3'
            }] },
            () => { /* unused */ },
            async (menuTitle: string, menuOptions: any[], _index: number, menuHint?: string) => {
                title = menuTitle; options = menuOptions; hint = menuHint ?? ''; return undefined;
            },
            'session-1', 'session-1', zh
        );
        expect(title).toEqual('轮次诊断记录（session-1）');
        expect(hint).toEqual('1 条');
        expect(options[0].description).toContain('2 次压缩');
        expect(options[0].description).toContain('节省 4K tokens');
        expect(options[0].description).toContain('重复');
        expect(options[0].detail).toContain('压缩层级：L3');
        expect(options[0].detail).toContain('重复澄清：是');
        expect(options[0].detail).toContain('最终澄清：否');
    }

    @Test('/harness profile output is localized')
    async harnessProfileLocalized() {
        const outputs: string[] = [];
        const ctx: any = {
            translator: zh,
            state: { sessionId: 's1' },
            sessionService: {
                listHarnessProfiles: async () => ({
                    current: 'default',
                    profiles: [
                        { name: 'default', version: 1, maxRepairRounds: 2, maxLoopRecoveries: 3, granularCategories: ['sandbox', 'fs'] },
                        { name: 'strict', version: 1, sandbox: { mode: 'network-block' } }
                    ]
                }),
                currentHarnessProfile: async () => ({
                    name: 'strict', version: 1, requireApproval: ['shell'], sandbox: { mode: 'network-block', networkAllowlist: ['api.example.com'] },
                    maxRepairRounds: 1, maxLoopRecoveries: 2
                }),
                diffHarnessProfiles: async () => ({ from: 'default', to: 'current', diff: [] })
            },
            notify: () => { /* unused */ },
            pushCommandOutput: (_command: string, text: string) => { outputs.push(text); }
        };
        await openHarnessProfile(ctx, '');
        expect(outputs[0].split('\n')).toEqual([
            '治理 profile · 当前 default',
            'profile default · v1 · 修复 2 · 循环恢复 3 · 细分 sandbox,fs',
            'profile strict · v1 · 沙箱 network-block'
        ]);
        await openHarnessProfile(ctx, 'current');
        expect(outputs[1].split('\n')).toEqual([
            '治理 profile strict · v1',
            '审批 shell',
            '沙箱 network-block · 允许 api.example.com',
            '最大修复轮次 1',
            '最大循环恢复 2'
        ]);
        await openHarnessProfile(ctx, 'diff');
        expect(outputs[2].split('\n')).toEqual(['治理 profile 差异 default → current', '  （无差异）']);
        // A sandbox object without a mode must not render `沙箱 undefined`.
        ctx.sessionService.currentHarnessProfile = async () => ({ name: 'default', version: 1, sandbox: {} });
        await openHarnessProfile(ctx, 'current');
        expect(outputs[3].split('\n')).toEqual(['治理 profile default · v1']);
    }

    @Test('/harness audit report is localized')
    async harnessAuditLocalized() {
        const outputs: string[] = [];
        const ctx: any = {
            translator: zh,
            state: { sessionId: 's1' },
            sessionService: {
                runHarnessAudit: async () => ({
                    totalTurns: 10, totalToolAttempts: 40, failureTurnRate: 20,
                    topFailingTools: [{ toolName: 'bash', failures: 3, attempts: 8, failureRate: 37.5, falsifiedCount: 1 }],
                    errorClusters: [{ signature: 'timeout', count: 2, toolNames: ['bash'], suggestedPolicy: 'retry' }],
                    falsifiedDistribution: [{ toolName: 'bash', falsifiedCount: 1, falsifiedRate: 12.5 }],
                    suggestions: [{ kind: 'retry', toolName: 'bash', message: 'retry with a shorter timeout' }]
                })
            },
            notify: () => { /* unused */ },
            pushCommandOutput: (_command: string, text: string) => { outputs.push(text); }
        };
        await openHarnessAudit(ctx);
        expect(outputs[0].split('\n')).toEqual([
            '治理审计 · 全部会话 · 10 轮 · 40 次工具调用 · 失败轮次 20%',
            '工具 bash · 3/8（37.5%）· 伪证 1',
            '聚类 timeout · x2 · 工具 bash · retry',
            '伪证 bash · 1（12.5%）',
            '建议[retry] bash · retry with a shorter timeout'
        ]);
    }
    @Test('/pager HUD copy is localized and forwarded to the terminal surface')
    async pagerCopyLocalized() {
        const calls: Array<{ query?: string; copy: any }> = [];
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        (component as any).translator = zh;
        (component as any).surfaceAccessor = {
            openPagerFromLastRender: (query: string, copy: any) => { calls.push({ query, copy }); return true; }
        };
        const ctx: any = (component as any).buildCommandContext();
        expect(ctx.openPager('needle')).toEqual(true);
        expect(calls[0].query).toEqual('needle');
        expect(calls[0].copy.plain).toEqual('翻页 · Esc 关闭 · ↑↓ 滚动');
        expect(calls[0].copy.withMatches).toEqual('翻页 {index}/{total} · Esc 关闭 · ↑↓ 滚动');
    }
    @Test('command output titles and rows are localized')
    async commandOutputsLocalized() {
        const outputs: Array<{ command: string; text: string }> = [];
        const base = {
            translator: zh,
            state: { sessionId: 's1', titleFields: ['model', 'tokens'] },
            notify: () => { /* unused */ },
            pushCommandOutput: (command: string, text: string) => { outputs.push({ command, text }); }
        };
        await runTitleCommand(base as any, 'list');
        expect(outputs[0].text).toEqual('窗口标题：model, tokens。使用 /title set field1,field2 或 unset field 修改。');

        await runStashCommand({
            ...base,
            stashStore: { load: async () => ({ draft: 'hello' }) },
            resolveHistoryWorkspace: () => '/tmp/ws'
        } as any, 'list');
        expect(outputs[1].text).toEqual('暂存草稿：draft（5 字符）。');

        await runQueueCommand({
            ...base,
            appRpc: null,
            runtime: { setPlanMode: () => { /* unused */ } },
            queuedPrompts: new Map([['s1', [{ command: true, input: 'do it', attachments: [{ id: 'a1' }] }]]]),
            select: async () => undefined,
            rpcRequestContext: () => ({ sessionEpoch: 0 }),
            revokeShare: async () => true
        } as any, 'list');
        expect(outputs[2].text.split('\n')).toEqual(['排队提示（1）：', '1. [命令] do it（+1 个附件）']);

        await runBackgroundTasksCommandView({
            ...base,
            state: { sessionId: 's1', backgroundTaskFeed: [{ id: 't1', sessionId: 's1', status: 'running', goal: 'fix tests' }] },
            backgroundTasks: {}
        } as any, 'all');
        expect(outputs[3].text.split('\n')).toEqual(['后台任务（all）：', 'RUNNING t1 [会话 s1] - fix tests']);
    }

    @Test('IDE and voice output copy is localized')
    async ideAndVoiceOutputsLocalized() {
        const outputs: Array<{ command: string; text: string }> = [];
        const notices: string[] = [];
        await runIdeCommand(
            { getContext: async () => ({ activeFile: '/work/demo/src/main.ts', selection: { startLine: 4, endLine: 9 }, platform: 'vscode' }) },
            (message: string) => notices.push(message),
            (command: string, text: string) => outputs.push({ command, text }),
            'show',
            zh
        );
        expect(outputs[0].text).toEqual('IDE 上下文：/work/demo/src/main.ts 第 4-9 行 (vscode)');

        const voiceCtx: any = {
            translator: zh,
            state: { sessionId: 's1' },
            sessionService: {
                getVoiceStatus: async () => ({ available: true, active: true, bufferedBytes: 12, missing: [] }),
                endVoiceSession: async () => ({ ok: true, transcribed: 'hello', reply: 'hi there' })
            },
            audioCapture: null,
            audioPlayback: null,
            notify: () => { /* unused */ },
            pushCommandOutput: (command: string, text: string) => { outputs.push({ command, text }); },
            getCaptureSessionId: () => '',
            setCaptureSessionId: () => { /* unused */ },
            getCaptureFeed: async () => { /* unused */ },
            setCaptureFeed: () => { /* unused */ }
        };
        await handleVoiceCommand(voiceCtx, 'status');
        expect(outputs[1].text.split('\n')).toEqual(['语音 可用 · 会话 活动 · 缓冲 12 字节', '用法：/voice start|stop|cancel|status']);
        await handleVoiceCommand(voiceCtx, 'stop');
        expect(outputs[2].text).toEqual('转录：hello\n回复：hi there');
    }

    @Test('approval inspector title, options and detail are localized')
    async approvalInspectorLocalized() {
        let title = '';
        let options: any[] = [];
        const request = { id: 'abcd1234ef', toolName: 'bash', reason: '需要审批', inputSummary: '', timeoutMs: 30000 };
        const host: any = {
            translator: zh,
            state: { consoleOptions: { selectHint: 'hint' } },
            notify: () => { /* unused */ },
            selectApprovalRequest: async () => ({ ...request }),
            select: async (menuTitle: string, menuOptions: any[]) => {
                title = menuTitle;
                options = menuOptions;
                return undefined;
            },
            applyApprovalDecision: async () => true,
            refreshPendingApprovals: async () => { /* unused */ },
            copyFocusedTextActionHandler: async () => { /* unused */ }
        };
        await openApprovalInspector(host, [{ ...request } as any]);
        expect(title).toEqual('审批 abcd1234');
        expect(options.map(option => option.label)).toEqual(['批准', '拒绝', '复制输入']);
        expect(options[0].description).toEqual('允许该请求');
        expect(options[0].detail.split('\n').filter(Boolean)).toEqual(['工具：bash', '原因：需要审批', '输入：-', '超时：30000ms']);
    }

    @Test('share panel and thinking-level dialogs are localized')
    async shareAndThinkingDialogsLocalized() {
        let shareTitle = '';
        let shareOptions: any[] = [];
        let shareLabel = '';
        const shareFake: any = Object.create(AgentConsoleComponent.prototype);
        shareFake.translator = zh;
        shareFake.state = { consoleOptions: {} };
        shareFake.select = async (title: string, options: any[]) => { shareTitle = title; shareOptions = options; return 'copy'; };
        Object.defineProperty(shareFake, 'copyFocusedTextActionHandler', {
            value: async (_text: string, label: string) => { shareLabel = label; }
        });
        await shareFake.openSharePanel('tok123456789', '/s/tok123456789');
        expect(shareTitle).toEqual('会话分享');
        expect(shareOptions[0].label).toEqual('已创建分享');
        expect(shareOptions[1].description).toEqual('复制分享链接');
        expect(shareOptions[2].label).toEqual('撤销（tok12345…）');
        expect(shareLabel).toEqual('分享链接');

        let thinkingTitle = '';
        let thinkingOptions: any[] = [];
        const thinkingFake: any = Object.create(AgentConsoleComponent.prototype);
        thinkingFake.translator = zh;
        thinkingFake.modelReasoningEffort = 'medium';
        thinkingFake.select = async (title: string, options: any[]) => { thinkingTitle = title; thinkingOptions = options; return undefined; };
        thinkingFake.setModelReasoningEffort = async () => true;
        await thinkingFake.openSettingsThinkingLevel();
        expect(thinkingTitle).toEqual('设置 · 思考强度');
        expect(thinkingOptions.find(option => option.value === 'medium').description).toEqual('当前等级');
        expect(thinkingOptions.find(option => option.value === 'high').description).toEqual('设置推理强度');
    }
    @Test('plan nudge copy lives in the input panel and is localized')
    async planNudgePanelCopyLocalized() {
        const panelState = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const panel = new AgentConsoleInputPanelComponent(panelState, zh);
        panelState.setInput('Please design the architecture before changing any files.');
        expect(panelState.planNudgeActive).toEqual(true);
        expect(panel.metaLabel).toContain('检测到规划意图 · 使用 /plan');
        const enPanel = new AgentConsoleInputPanelComponent(panelState);
        expect(enPanel.metaLabel).toContain('Planning intent detected · use /plan');
    }

    @Test('command argument diagnostics and diff scope copy are localized')
    async commandDiagnosticsLocalized() {
        const translate = (key: string, params?: Record<string, any>, fallback?: string) => {
            const value = zh.translate(key, params);
            return value && value !== key ? value : (fallback ?? key);
        };
        const missing = parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/search'), '', translate);
        expect(missing.diagnostics[0].message).toEqual('缺少必需参数 <query>。');
        expect(missing.diagnostics[0].suggestion).toEqual('用法：/search query。');
        expect(formatAgentConsoleCommandDiagnosticEcho(missing.diagnostics, translate)).toEqual([
            '缺少必需参数 <query>。',
            '期望：<query>',
            '可能：用法：/search query。'
        ]);

        const single = { name: '/single', description: 'single', group: 'core' as const, args: [{ name: 'value' }] };
        const extra = parseAgentConsoleCommandArguments(single, 'one two', translate);
        expect(extra.diagnostics[0].message).toEqual('多余的参数：two。');
        expect(extra.diagnostics[0].suggestion).toEqual('请移除多余参数 —— 该命令不接受更多参数。');
        expect(parseAgentConsoleCommandArguments(single, 'one two').diagnostics[0].message).toEqual('Unexpected argument: two.');

        const staged = parseWorktreeDiffArgs('--staged --untracked', zh as any);
        expect(staged.error).toEqual('--staged、--unstaged、--untracked 只能选其一。');
        expect(parseWorktreeDiffArgs('--staged --untracked').error).toEqual('Use only one of --staged, --unstaged, or --untracked.');
        expect(parseWorktreeDiffArgs('--nope', zh as any).error).toEqual('未知的 /diff 选项：--nope');
        expect(describeWorktreeDiffScope('working-tree', zh as any)).toEqual('工作区');
        expect(describeWorktreeDiffScope('staged', zh as any)).toEqual('已暂存');
        expect(describeWorktreeDiffScope('staged')).toEqual('Staged');
    }

    @Test('export preview, attachments and health details are localized')
    async exportAndHealthLocalized() {
        let menu: any = null;
        const ctx: any = {
            translator: zh,
            state: {
                openSelectMenu: (title: string, options: any[], index: number, hint?: string) => {
                    menu = { title, options, index, hint };
                }
            }
        };
        const { previewSessionExport } = await import('../src/AgentConsoleExportHandlers');
        previewSessionExport(ctx, {
            format: 'json',
            fileName: 'session.json',
            content: '{}',
            messages: [{}, {}],
            toolCalls: [{}],
            session: { messageCount: 2, toolCallCount: 1 }
        } as any);
        expect(menu.title).toEqual('会话导出（json）');
        expect(menu.options[0].description).toEqual('2 条消息 · 1 次工具调用');
        expect(menu.hint).toEqual('只读导出预览。按 Esc 关闭。');

        expect(describePendingAttachments([], zh)).toEqual('没有待处理的附件。');
        expect(describePendingAttachments([{ name: 'a.png' }] as any, zh)).toEqual('待处理附件：a.png');
        expect(describePendingAttachments([])).toEqual('No pending attachments.');

        const items = await collectHealthItems(null, () => ({}), {
            tools: [
                { name: 'mcp.github.list', active: true },
                { name: 'mcp.github.create', active: false },
                { name: 'lsp_hover', active: true }
            ]
        }, zh);
        expect(items.find(item => item.id === 'gateway').detail).toEqual('本地运行时（无网关）');
        expect(items.find(item => item.id === 'mcp:github').detail).toEqual('1/2 个工具已激活');
        expect(items.find(item => item.id === 'lsp').detail).toEqual('1 个工具可用');
        const noTools = await collectHealthItems(null, () => ({}), { tools: [] }, zh);
        expect(noTools.find(item => item.id === 'mcp').detail).toEqual('未配置 MCP 服务器');
        expect(noTools.find(item => item.id === 'lsp').detail).toEqual('没有可用的 LSP 工具');
    }
    @Test('git snapshot list, confirm, and diff chrome is localized')
    async gitSnapshotCopyLocalized() {
        const selects: Array<{ title: string; options: any[] }> = [];
        let detail: any = null;
        const host: any = {
            translator: zh,
            state: {
                sessionId: 's1',
                consoleOptions: { selectHint: 'hint' },
                closeReview: () => { /* unused */ },
                openGitSnapshotDetail: (title: string, lines: string[], stats: string, ref: string) => {
                    detail = { title, lines, stats, ref };
                }
            },
            sessionService: {
                listGitStepSnapshots: async () => [
                    { label: 'step 1', messageId: 'm1', id: 'snap-1', timestamp: 0, diffStats: { totalAdditions: 3, totalDeletions: 2, filesChanged: 1 } }
                ],
                diffGitStepSnapshot: async () => ({ files: [{ path: 'a.ts' }], hunks: [] }),
                revertGitStepSnapshot: async () => ({ reverted: true }),
                unrevertGitStepSnapshot: async () => ({ reverted: true })
            },
            notify: () => { /* unused */ },
            select: async (title: string, options: any[]) => { selects.push({ title, options }); return undefined; }
        };
        await runGitSnapshotsCommand(host, 'list');
        expect(selects[0].title).toEqual('Git 步骤快照（1）');
        expect(selects[0].options[0].label).toEqual('step 1 · +3/-2（1 个文件）');

        await runGitSnapshotsCommand(host, 'revert 1');
        expect(selects[1].title).toEqual('将工作区恢复到消息 1 的快照？');
        expect(selects[1].options.map(option => option.label)).toEqual(['回退', '取消']);
        expect(selects[1].options[0].detail).toEqual('用该快照恢复工作区');
        expect(selects[1].options[1].detail).toEqual('保留当前工作区');

        await runGitSnapshotsCommand(host, 'unrevert');
        expect(selects[2].title).toEqual('恢复最近一次 git 回退前捕获的工作区？');
        expect(selects[2].options.map(option => option.label)).toEqual(['撤销回退', '取消']);
        expect(selects[2].options[1].detail).toEqual('保留已回退的工作区');

        await openGitSnapshotDiff(host, 'snap-1');
        expect(detail.title).toEqual('git 快照 snap-1');
        expect(detail.stats).toEqual('引用 snap-1 · 文件 1');
        expect(detail.ref).toEqual('snap-1');
    }
    @Test('copy notice labels are localized through the state and command contexts')
    async copyLabelsLocalized() {
        const notices: string[] = [];
        const component = createConsole(new RuntimeStub(), new SchedulerStub());
        (component as any).translator = zh;
        (component as any).surfaceAccessor = { writeTerminalClipboardText: () => true };
        (component as any).notify = (message: string) => notices.push(message);
        (component as any).state.configure({ sessionId: 's1' });
        (component as any).state.setInput('draft text');
        (component as any).state.setWorkspace('/tmp/ws');
        await (component as any).handleCommand('/copy input');
        expect(notices[0]).toEqual('已复制 输入。');
        await (component as any).handleCommand('/copy workspace');
        expect(notices[1]).toEqual('已复制 工作区。');
        await (component as any).handleCommand('/copy session');
        expect(notices[2]).toEqual('已复制 会话。');

        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl(), zh as any);
        const labels: string[] = [];
        state.copyFocusedTextAction = async (_text: string, label: string) => { labels.push(label); };
        state.setSelectedToolName('bash');
        state.setToolsFocused(true);
        await state.handleFocusKey('copy', undefined as any);
        expect(labels[0]).toEqual('工具名');
    }
    @Test('assistant worked/done footer follows the locale')
    async workedFooterLocalized() {
        const message = { id: 'final-summary', role: 'assistant', content: '完成', createdAt: 1000, metadata: { durationMs: 542000, completedAt: 325000 } } as any;
        const zhItems = renderAgentConsoleMessageItems([message], { translator: zh } as any);
        expect(zhItems[0].lines.at(-1)?.meta).toContain('用时 9m 2s · 完成于 ');
        const enItems = renderAgentConsoleMessageItems([message], { translator: en } as any);
        expect(enItems[0].lines.at(-1)?.meta).toContain('Worked for 9m 2s · done ');
    }
    @Test('resumed timeline rows are projected in the current locale')
    async replayProjectionLocalized() {
        const zhState = new AgentConsoleSessionState(new InMemoryCommandExecutionControl(), zh as any);
        zhState.configure({ sessionId: 'seed-zh' } as any);
        zhState.seedTimeline([
            { sessionId: 'seed-zh', kind: 'tool', label: 'bash', status: 'completed', durationMs: 1200, sequence: 1 },
            { sessionId: 'seed-zh', kind: 'tool', label: 'read_file', status: 'failed', summary: 'ENOENT', sequence: 2 },
            { sessionId: 'seed-zh', kind: 'plan', label: '修复登录', status: 'completed', sequence: 3 },
            { sessionId: 'seed-zh', kind: 'step', label: '改代码', status: 'running', sequence: 4 }
        ] as any);
        const zhRows = zhState.messages.map(message => String(message.content || ''));
        expect(zhRows).toContain('bash 已完成 · 1200ms');
        expect(zhRows).toContain('read file 失败：ENOENT');
        expect(zhRows).toContain('计划已完成：修复登录');
        expect(zhRows).toContain('步骤开始：改代码');

        const enState = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        enState.configure({ sessionId: 'seed-en' } as any);
        enState.seedTimeline([
            { sessionId: 'seed-en', kind: 'tool', label: 'bash', status: 'completed', durationMs: 1200, sequence: 1 },
            { sessionId: 'seed-en', kind: 'turn', status: 'completed', sequence: 2 }
        ] as any);
        const enRows = enState.messages.map(message => String(message.content || ''));
        expect(enRows).toContain('bash completed · 1200ms');
        expect(enRows).toContain('Turn completed');
    }
}
