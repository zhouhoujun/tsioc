import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleQuestionMessageRenderer, AgentConsoleThoughtMessageRenderer, AgentConsoleToolMessageRenderer } from '../src';

/**
 * P316: timeline role labels (`Thought · `, `Tool · `, `Plan · ` …) were static
 * English strings and stayed English under a zh-CN locale — a user-visible
 * string that bypassed i18n (AGENTS.md §9). They now resolve
 * `agent.timeline.<kind>` with the English label as fallback.
 */
@Suite('timeline role labels are localized (P316)')
export class TimelineRoleLabelI18nTest {
    @Test('a kind renderer resolves its role label through the translator')
    async localizedRoleLabel() {
        const translator = { translate: (key: string) => `T:${key}` };
        const renderer = new AgentConsoleToolMessageRenderer(translator as any);
        const result = renderer.resolve({} as any, 'tool' as any);
        expect(result.presentation.roleLabel).toBe('T:agent.timeline.tool');
    }

    @Test('the thought renderer uses its own key')
    async thoughtKey() {
        const translator = { translate: (key: string) => `T:${key}` };
        const renderer = new AgentConsoleThoughtMessageRenderer(translator as any);
        expect(renderer.resolve({} as any, 'thought' as any).presentation.roleLabel).toBe('T:agent.timeline.thought');
    }

    @Test('a host renderer label is not overridden by the catalog')
    async customLabelWins() {
        const translator = { translate: (key: string) => `T:${key}` };
        const renderer = new AgentConsoleQuestionMessageRenderer(translator as any);
        (renderer as any).label = '? ';
        expect(renderer.resolve({} as any, 'question' as any).presentation.roleLabel).toBe('? ');
    }

    @Test('without a translator the English label is kept')
    async fallbackRoleLabel() {
        const renderer = new AgentConsoleToolMessageRenderer();
        const result = renderer.resolve({} as any, 'tool' as any);
        expect(result.presentation.roleLabel).toBe('Tool · ');
    }
}
