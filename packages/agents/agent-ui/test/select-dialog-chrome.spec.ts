import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { TuiRenderer, TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentConsoleSelectPanelComponent, AgentUiModule } from '../src';

function plain(lines: string[]): string[] {
    return lines.map(line => line.replace(/\x1b\[[0-9;]*m/g, ''));
}

/**
 * Real PTY finding: `<select>` dialogs rendered their option rows but never
 * the menu title or key hint. A confirmation dialog therefore showed only
 * "revert / cancel" and never the question it was asking.
 */
@Suite('select dialog renders title and hint')
export class SelectDialogChromeSuite {
    private ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
    }

    @After()
    async clean() { await this.ctx?.close(); }

    protected async renderMenu(
        title: string,
        options: Array<{ label: string; value: string }>,
        hint: string,
        width = 80,
        prepare?: (state: any) => void
    ): Promise<{ lines: string[]; state: any }> {
        const ref = this.ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: this.ctx }) as ComponentRef<AgentConsoleComponent>;
        await ref.render();
        const state = ref.instance.sessionState;
        state.openSelectMenu(title, options, 0, hint);
        prepare?.(state);
        for (let index = 0; index < 60; index++) await Promise.resolve();
        const panel = ref.hostView.query(AgentConsoleSelectPanelComponent) as ComponentRef<AgentConsoleSelectPanelComponent>;
        const renderer = this.ctx.get(TuiRenderer);
        return { lines: plain(renderer.renderToTuiLines(panel.hostView.rootNodes[0], { width })), state };
    }

    @Test('a blocking command menu shows its title, options and hint')
    async blockingMenuChrome() {
        const { lines } = await this.renderMenu('Security level', [
            { label: 'Ask for approval', value: 'ask' },
            { label: 'Full Access', value: 'full' }
        ], 'up/down move   enter confirm   q cancel');
        const body = lines.join('\n');
        expect(body).toContain('Security level');
        expect(body).toContain('Ask for approval');
        expect(body).toContain('up/down move');
    }

    @Test('a confirmation question stays readable in a narrow terminal')
    async confirmationQuestionWraps() {
        const question = 'Revert working tree to snapshot of message deadbeef?';
        const { lines } = await this.renderMenu(question, [
            { label: 'revert', value: 'yes' },
            { label: 'cancel', value: 'no' }
        ], 'up/down move   enter confirm', 40);
        const body = lines.join('\n');
        for (const word of ['Revert', 'working', 'tree', 'snapshot', 'deadbeef?']) {
            expect(body).toContain(word);
        }
        expect(body).toContain('cancel');
        expect(body).toContain('enter confirm');
    }

    @Test('a long menu shows its window position')
    async longMenuMeta() {
        const options = Array.from({ length: 30 }, (_value, index) => ({ label: `model-${index + 1}`, value: String(index) }));
        const { lines } = await this.renderMenu('Model providers', options, 'up/down move');
        const body = lines.join('\n');
        expect(body).toContain('1-12/30');
        expect(body).toContain('model-1');
    }

    @Test('inline suggestions keep their chrome inline')
    async suggestionMenuStaysInline() {
        const { lines } = await this.renderMenu('Suggestions', [
            { label: '/help', value: '/help' }
        ], 'enter execute   tab complete');
        const body = lines.join('\n');
        expect(body).not.toContain('Suggestions');
        expect(body).not.toContain('enter execute');
        expect(body).toContain('/help');
    }
}
