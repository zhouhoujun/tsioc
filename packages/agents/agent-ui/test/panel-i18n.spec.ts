import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { agentUiChinese, agentUiEnglish } from '../src/agent-ui.i18n';
import { buildAgentConsoleHelpOptions } from '../src/AgentConsoleCommandRegistry';
import { runStatusCommand } from '../src/AgentConsoleRuntimeCommands';
import {
    AgentConsoleCommandOutputsPanelComponent,
    AgentConsoleJobsPanelComponent,
    AgentConsolePendingQuestionPanelComponent,
    AgentConsoleSessionsPanelComponent,
    AgentConsoleTextOverlayPanelComponent,
    AgentConsoleWhichKeyPanelComponent,
    AgentConsoleWorkingPanelComponent
} from '../src/AgentConsolePanels';
import { formatUsageSummary } from '../src/AgentConsoleFormatters';
import { refreshUsageDigest } from '../src/AgentConsoleDiagnosticsView';
import { runDebugConfigCommand, runMemoriesCommand, runPersonalityCommand } from '../src/AgentConsolePreferenceCommands';
import { runAppsCommand } from '../src/AgentConsoleExtensionCommands';
import { AgentConsoleComponent } from '../src/AgentConsoleComponent';

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
}
