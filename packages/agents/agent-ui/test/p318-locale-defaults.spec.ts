import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';

/**
 * P318: the console's built-in label sets (`timelineLabels`,
 * `messageStatusLabels`) were hardcoded Chinese, so an en-locale host showed
 * `正在执行` / Chinese timeline sentences while the i18n catalog rendered
 * English. `EN_TIMELINE_LABELS` existed but was only referenced by tests.
 */
@Suite('console default labels follow the locale (P318)')
export class LocaleDefaultsTest {
    private translator(locale: string) {
        return { currentLocale: locale, translate: (key: string) => key } as any;
    }

    @Test('an en locale uses the English timeline/status labels')
    async englishDefaults() {
        const state = new AgentConsoleSessionState(undefined, this.translator('en'));
        expect(state.consoleOptions.timelineLabels.footerDone).toBe('Done');
        expect(state.consoleOptions.timelineLabels.collapsedTurn).toBe('turn {index}');
        expect(state.consoleOptions.messageStatusLabels.success).toBe('Success');
    }

    @Test('a zh locale keeps the Chinese defaults')
    async chineseDefaults() {
        const state = new AgentConsoleSessionState(undefined, this.translator('zh-CN'));
        expect(state.consoleOptions.timelineLabels.footerDone).toBe('完成');
        expect(state.consoleOptions.messageStatusLabels.success).toBe('成功');
    }

    @Test('without a translator the built-in defaults stay')
    async noTranslator() {
        const state = new AgentConsoleSessionState();
        expect(state.consoleOptions.timelineLabels.footerDone).toBe('完成');
        expect(state.consoleOptions.messageStatusLabels.success).toBe('成功');
    }
}
