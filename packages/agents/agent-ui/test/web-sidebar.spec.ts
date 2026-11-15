import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { JSDOM } from 'jsdom';
import { AgentConsoleSessionState } from '../src';
import { createWebSidebar } from '../web-console/sidebar';

function createFixture(): {
    dom: JSDOM;
    mount: HTMLElement;
    state: AgentConsoleSessionState;
    navigated: string[];
    commands: string[];
} {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="mount"><tab-bar></tab-bar><div class="input-meta"></div></div></body></html>', {
        url: 'http://localhost:3100/?session=root'
    });
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.configure({ sessionId: 'root', workspace: '' });
    state.setActiveArchetype('plan');
    state.setSessions([
        { id: 'root', current: true, title: 'Main session', updatedAt: Date.now() - 60_000 } as any,
        { id: 'other', current: false, title: 'Reviewer', updatedAt: Date.now() - 3_600_000 } as any
    ]);
    return {
        dom,
        mount: dom.window.document.getElementById('mount') as HTMLElement,
        state,
        navigated: [],
        commands: []
    };
}

@Suite('web agent sidebar')
export class WebAgentSidebarTest {
    @Test('mirrors the active profile and sessions, and routes clicks')
    async renders() {
        const fixture = createFixture();
        const sidebar = createWebSidebar({
            document: fixture.dom.window.document,
            mount: fixture.mount,
            state: fixture.state,
            runCommand: command => { fixture.commands.push(command); },
            navigate: sessionId => { fixture.navigated.push(sessionId); }
        });
        await Promise.resolve();
        await Promise.resolve();

        expect(fixture.dom.window.document.body.getAttribute('data-agent-sidebar')).toEqual('open');
        expect(sidebar.element.querySelector('.is-agent .agent-web-sidebar-main')?.textContent).toEqual('plan');
        const rows = Array.from(sidebar.element.querySelectorAll('.is-session')) as HTMLElement[];
        expect(rows.length).toEqual(2);
        expect(rows[0].classList.contains('is-current')).toEqual(true);
        expect(rows[0].textContent).toContain('Main session');
        expect(rows[1].textContent).toContain('Reviewer');

        rows[1].dispatchEvent(new fixture.dom.window.MouseEvent('click', { bubbles: true }));
        expect(fixture.navigated).toEqual(['other']);
        (sidebar.element.querySelector('.is-agent') as HTMLElement)
            .dispatchEvent(new fixture.dom.window.MouseEvent('click', { bubbles: true }));
        expect(fixture.commands).toEqual(['/agents']);
        (sidebar.element.querySelector('.agent-web-sidebar-action') as HTMLElement)
            .dispatchEvent(new fixture.dom.window.MouseEvent('click', { bubbles: true }));
        expect(fixture.commands).toEqual(['/agents', '/work']);

        (sidebar.element.querySelector('.agent-web-sidebar-collapse') as HTMLElement)
            .dispatchEvent(new fixture.dom.window.MouseEvent('click', { bubbles: true }));
        expect(fixture.dom.window.document.body.getAttribute('data-agent-sidebar')).toEqual('closed');
        sidebar.toggle.dispatchEvent(new fixture.dom.window.MouseEvent('click', { bubbles: true }));
        expect(fixture.dom.window.document.body.getAttribute('data-agent-sidebar')).toEqual('open');

        sidebar.dispose();
        expect(fixture.dom.window.document.querySelector('.agent-web-sidebar')).toBeNull();
        expect(fixture.dom.window.document.querySelector('.agent-web-sidebar-toggle')).toBeNull();
        expect(fixture.dom.window.document.body.hasAttribute('data-agent-sidebar')).toEqual(false);
    }
}
