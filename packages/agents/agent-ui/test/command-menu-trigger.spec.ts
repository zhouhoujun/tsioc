import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { getAgentConsoleInputTokenRange, resolveAgentConsoleInputSuggestions } from '../src/AgentConsoleSuggestions';

@Suite('slash command menu trigger')
export class CommandMenuTriggerTest {

    @Test('the command menu only triggers when the slash token starts the input')
    slashTokenMustStartInput() {
        // A line-start command resolves its token.
        expect(getAgentConsoleInputTokenRange('/time', 5)?.token).toEqual('/time');
        expect(getAgentConsoleInputTokenRange('/', 1)?.token).toEqual('/');
        // A `/`-word later in the message (e.g. a path) must not resolve.
        expect(getAgentConsoleInputTokenRange('check /tmp/foo', 14)).toBeUndefined();
        expect(getAgentConsoleInputTokenRange('see /tmp', 8)).toBeUndefined();
        // Mentions may still appear anywhere in the message.
        expect(getAgentConsoleInputTokenRange('see @model', 10)?.token).toEqual('@model');
    }

    @Test('a path-like slash word does not open the command palette')
    pathWordNoCommandPalette() {
        const commands = ['/help', '/status', '/timeline'];
        expect(resolveAgentConsoleInputSuggestions('check /tmp/foo', 14, commands)).toEqual([]);
        // A real command still opens the palette.
        expect(resolveAgentConsoleInputSuggestions('/tim', 4, commands).map(o => o.value)).toContain('/timeline');
    }
}
