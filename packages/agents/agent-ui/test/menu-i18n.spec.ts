import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { agentUiChinese, agentUiEnglish } from '../src/agent-ui.i18n';
import { getModelProfileOptions, loadModelProfileOptions, openModelSwitcher } from '../src/AgentConsoleModelHandlers';
import { runThemeCommand } from '../src/AgentConsoleRuntimeCommands';
import { openSettingsLanguage, runSettingsCommand } from '../src/AgentConsoleSettingsCommands';
import { runSkillsCommand } from '../src/AgentConsoleExtensionCommands';
import { formatToolPanelInactiveSuffix, formatToolPanelLastRun, formatToolPanelStatus, formatToolPanelTitle } from '../src/AgentConsoleToolPanelText';

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

const zh = { translate: translateFrom(agentUiChinese as any) };
const en = { translate: translateFrom(agentUiEnglish as any) };

function modelContext(translator: any, profiles: Record<string, any>) {
    return {
        translator,
        state: { sessionId: 's1', modelProfile: 'flash' },
        options: () => ({ model: { profiles } }),
        notify() {}
    } as any;
}

/**
 * Real TUI finding: switching the UI to zh-CN translated commands/notices but
 * every select menu stayed English (`3 configured models`, `Add new provider`,
 * `enter confirm   esc back`, `Settings · General`, …). The menu chrome is now
 * resolved through the translator with the English strings as fallback, and a
 * runtime language switch re-applies the console option defaults.
 */
@Suite('command menu chrome is localized')
export class MenuI18nTest {
    @Test('model profile labels and details use the active locale')
    async modelProfilesLocalized() {
        const options = getModelProfileOptions(modelContext(zh, {
            flash: { provider: 'deepseek', model: 'deepseek-v4-flash', reasoning: false, thinkingBudget: 1000 }
        }));
        expect(options[0].label).toEqual('flash [当前]');
        expect(options[0].detail).toContain('配置：flash');
        expect(options[0].detail).toContain('提供方：deepseek');
        expect(options[0].detail).toContain('模型：deepseek-v4-flash');
        expect(options[0].detail).toContain('推理：关');
        expect(options[0].detail).toContain('思考预算：1000');
    }

    @Test('catalog model details and effort row are localized')
    async catalogLocalized() {
        const ctx = modelContext(zh, {});
        ctx.appRpc = {
            request: async (method: string) => {
                if (method === 'model.list') {
                    return [{ name: 'flash', provider: 'deepseek', model: 'deepseek-v4-flash', selected: true }];
                }
                if (method === 'model.catalog') {
                    return {
                        provider: 'deepseek',
                        models: [{ id: 'deepseek-v4-pro', name: 'Pro', effort: { supportedLevels: ['low', 'high'], defaultLevel: 'high' } }]
                    };
                }
                return undefined;
            }
        };
        const options = await loadModelProfileOptions(ctx);
        expect(options[0].label).toEqual('flash [当前]');
        const pro = options.find(option => option.value === 'deepseek/deepseek-v4-pro')!;
        expect(pro.detail).toContain('提供方：deepseek');
        expect(pro.detail).toContain('推理强度：low, high（默认 high）');
    }

    @Test('model provider menu and add-provider row are localized')
    async providerMenuLocalized() {
        const ctx = modelContext(zh, {
            'deepseek-fast': { provider: 'deepseek', model: 'deepseek-flash' },
            'deepseek-strong': { provider: 'deepseek', model: 'deepseek-pro' }
        });
        let captured: any;
        ctx.select = async (title: string, options: any[]) => {
            captured = { title, options };
            return undefined;
        };
        await openModelSwitcher(ctx);
        expect(captured.title).toEqual('模型提供方');
        expect(captured.options[0].label).toEqual('deepseek');
        expect(captured.options[0].description).toEqual('2 个已配置模型');
        const addProvider = captured.options.find((option: any) => option.value === '__add_provider__');
        expect(addProvider.label).toEqual('添加提供方');
        expect(addProvider.description).toEqual('配置新的提供方连接');
        expect(addProvider.detail).toContain('向导');
    }

    @Test('theme menu title, descriptions and hint are localized')
    async themeMenuLocalized() {
        let captured: any;
        const host: any = {
            translator: zh,
            activeThemeName: 'dark',
            select: async (title: string, options: any[], index: number, hint?: string) => {
                captured = { title, options, index, hint };
                return undefined;
            },
            applyTheme: async () => true,
            notify() {}
        };
        await runThemeCommand(host);
        expect(captured.title).toEqual('主题');
        expect(captured.options.find((option: any) => option.value === 'dark').description).toEqual('当前主题');
        expect(captured.options.find((option: any) => option.value === 'light').description).toEqual('应用并保存');
        expect(captured.hint).toContain('回车 应用');
    }

    @Test('settings tabs and hints are localized')
    async settingsTabsLocalized() {
        let captured: any;
        const host: any = {
            translator: zh,
            state: {},
            options: {},
            activeThemeName: 'dark',
            yoloMode: false,
            modelReasoningEffort: 'medium',
            select: async (title: string, options: any[], index: number, hint?: string) => {
                captured = { title, options, index, hint };
                return undefined;
            },
            notify() {},
            persistSettings: async () => undefined
        };
        await runSettingsCommand(host);
        expect(captured.title).toEqual('设置');
        expect(captured.options.map((option: any) => option.label)).toEqual(['常规', '快捷键', '提供方']);
        expect(captured.options[0].description).toEqual('主题、语言、输入开关');
        expect(captured.hint).toContain('回车 选择');
    }

    @Test('switching language re-applies console option defaults')
    async languageSwitchAppliesLocaleDefaults() {
        const applied: string[] = [];
        const locales: string[] = [];
        const host: any = {
            translator: {
                currentLocale: 'en',
                availableLocales: ['en', 'zh-CN'],
                setLocale: (locale: string) => { locales.push(locale); },
                translate: zh.translate
            },
            select: async (_title: string, options: any[]) => options[1].value,
            notify() {},
            persistSettings: async () => undefined,
            state: { applyLocaleDefaults: (locale: string) => { applied.push(locale); } }
        };
        await openSettingsLanguage(host);
        expect(locales).toEqual(['zh-CN']);
        expect(applied).toEqual(['zh-CN']);
    }

    @Test('skills menu is localized')
    async skillsMenuLocalized() {
        let captured: any;
        const host: any = {
            translator: zh,
            invokeTool: async () => ({ skills: [{ id: 'codebase', title: 'Codebase', summary: 'Explore', aliases: ['repo'], source: 'builtin' }] }),
            select: async (title: string, options: any[], index: number, hint?: string) => {
                captured = { title, options, index, hint };
                return undefined;
            },
            pushCommandOutput() {},
            notify() {}
        };
        await runSkillsCommand(host);
        expect(captured.title).toEqual('技能');
        expect(captured.hint).toContain('回车 详情');
        expect(captured.options[0].detail).toContain('标题：Codebase');
        expect(captured.options[0].detail).toContain('别名：repo');
    }

    @Test('tools panel status rows are localized')
    async toolsPanelLocalized() {
        expect(formatToolPanelTitle(zh, 64, 1)).toEqual('工具 64 · 1/64');
        expect(formatToolPanelInactiveSuffix(zh)).toEqual(' [未激活]');
        expect(formatToolPanelStatus(zh, { active: false, activationKind: 'deferred', toolset: 'filesystem' }))
            .toEqual('状态：未激活 · 激活方式：按需 · 工具集：filesystem');
        expect(formatToolPanelStatus(zh, { active: true, toolset: 'filesystem' }))
            .toEqual('状态：已激活 · 激活方式：始终 · 工具集：filesystem');
        expect(formatToolPanelLastRun(zh, 'success', ' 7ms', 'read_file'))
            .toEqual('上次运行 success 7ms：read_file');
    }

    @Test('English fallback keeps the previous copy')
    async englishFallback() {
        const options = getModelProfileOptions(modelContext(en, {
            flash: { provider: 'deepseek', model: 'deepseek-v4-flash' }
        }));
        expect(options[0].label).toEqual('flash [current]');
        expect(options[0].detail).toContain('Profile: flash');

        let captured: any;
        const host: any = {
            translator: undefined,
            activeThemeName: 'dark',
            select: async (title: string, options: any[], index: number, hint?: string) => {
                captured = { title, options, hint };
                return undefined;
            },
            applyTheme: async () => true,
            notify() {}
        };
        await runThemeCommand(host);
        expect(captured.title).toEqual('Theme');
        expect(captured.hint).toContain('enter apply');
    }
}
