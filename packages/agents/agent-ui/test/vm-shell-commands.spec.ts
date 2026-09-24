import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createConsole, RuntimeStub, SchedulerStub, ToolRegistryStub } from './_helpers';

@Suite('Agent console shell commands')
export class ShellCommandsTest {
    @Test('!! toggles multiline shell draft mode')
    async togglesMultilineDraftMode() {
        const component: any = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();

        expect(component.shellMultilineMode).toEqual(false);

        await component.handleShellBang('!!');
        expect(component.shellMultilineMode).toEqual(true);

        await component.handleShellBang('!!');
        expect(component.shellMultilineMode).toEqual(false);
    }

    @Test('!command runs the terminal tool and appends a shell message')
    async runsInlineShellCommand() {
        const component: any = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();
        const before = component.state.messages.length;

        await component.handleShellBang('!echo hi');

        const messages = component.state.messages;
        expect(messages.length).toEqual(before + 1);
        const shell = messages[messages.length - 1];
        expect(shell.role).toEqual('tool');
        expect(shell.name).toEqual('terminal');
        expect(shell.metadata.type).toEqual('shell');
        expect(shell.metadata.status).toEqual('success');
        expect(shell.content).toContain('$ echo hi');
    }

    @Test('multiline draft collects lines then submits with a lone bang')
    async collectsMultilineDraft() {
        const component: any = createConsole(new RuntimeStub(), new SchedulerStub(), new ToolRegistryStub());
        await component.onInit();

        await component.handleShellBang('!!');
        await component.handleShellBang('!line one');
        expect(component.shellDraftLines).toEqual(['line one']);

        await component.handleShellBang('!line two');
        expect(component.shellDraftLines).toEqual(['line one', 'line two']);

        await component.handleShellBang('!');

        expect(component.shellMultilineMode).toEqual(false);
        expect(component.shellDraftLines).toEqual([]);
        const messages = component.state.messages;
        const shell = messages[messages.length - 1];
        expect(shell.metadata.type).toEqual('shell');
        expect(shell.content).toContain('line one');
        expect(shell.content).toContain('line two');
    }
}
