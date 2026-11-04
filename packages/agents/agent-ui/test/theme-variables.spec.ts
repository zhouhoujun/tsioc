import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    agentConsoleThemes,
    defaultAgentConsoleTheme,
    resolveAgentConsoleCssVariables,
    resolveAgentConsoleThemeStyles
} from '../src';

@Suite('agent console theme styles')
export class AgentConsoleThemeStylesTest {
    @Test('theme component styles resolve through CSS variables')
    stylesUseVariables() {
        const styles = resolveAgentConsoleThemeStyles(defaultAgentConsoleTheme);
        expect(styles.workingShell.color).toEqual('var(--agent-theme-working-shell-color, #c9d1d9)');
        expect(styles.sessionsSelected.background).toEqual('var(--agent-theme-sessions-selected-background, #2a1f12)');
        expect(styles.sessionsSelected['font-weight']).toEqual('var(--agent-theme-sessions-selected-font-weight, bold)');
    }

    @Test('the selected theme publishes every declaration on the console root')
    rootPublishesVariables() {
        const variables = resolveAgentConsoleCssVariables(agentConsoleThemes.light);
        expect(variables).toContain('--agent-theme-working-shell-color:#24292f;');
        expect(variables).toContain('--agent-theme-input-shell-background:#f6f8fa;');
        expect(variables).toContain('--agent-theme-sessions-selected-background:#fff1e5;');
        expect(variables).toContain('--console-text:#24292f;');
    }
}
