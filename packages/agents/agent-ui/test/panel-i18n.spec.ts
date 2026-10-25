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
    AgentConsoleWhichKeyPanelComponent
} from '../src/AgentConsolePanels';

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
}
