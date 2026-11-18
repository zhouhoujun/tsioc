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
    countLoads: number;
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
        commands: [],
        countLoads: 0
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
            navigate: sessionId => { fixture.navigated.push(sessionId); },
            loadCounts: async () => {
                fixture.countLoads += 1;
                return { work: 2, inbox: 3 };
            }
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
        await new Promise(resolve => setTimeout(resolve, 0));
        const actionButtons = Array.from(sidebar.element.querySelectorAll('.agent-web-sidebar-action')) as HTMLElement[];
        expect(actionButtons[0].querySelector('.agent-web-sidebar-count')?.textContent).toEqual('2');
        expect(actionButtons[1].querySelector('.agent-web-sidebar-count')?.textContent).toEqual('3');
        expect(fixture.countLoads).toEqual(1);

        actionButtons[0].dispatchEvent(new fixture.dom.window.MouseEvent('click', { bubbles: true }));
        expect(fixture.commands).toEqual(['/agents', '/work']);
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(fixture.countLoads).toEqual(2);

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

function createFinderFixture(): {
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
    const now = Date.now();
    state.setSessions([
        { id: 'root', current: true, title: 'Main session', projectKey: 'workspace:/repo/alpha', projectLabel: 'alpha', updatedAt: now - 60_000 } as any,
        { id: 'other', current: false, title: 'Reviewer', projectKey: 'workspace:/repo/beta', projectLabel: 'beta', updatedAt: now - 3_600_000 } as any,
        { id: 'ancient', current: false, title: 'Ancient work', projectKey: 'workspace:/repo/beta', projectLabel: 'beta', updatedAt: now - 10 * 24 * 60 * 60 * 1000 } as any
    ]);
    return {
        dom,
        mount: dom.window.document.getElementById('mount') as HTMLElement,
        state,
        navigated: [],
        commands: []
    };
}

@Suite('web agent sidebar finders')
export class WebAgentSidebarFinderTest {
    @Test('session finder filters live, opens the first match and clears with Escape')
    async sessionSearch() {
        const fixture = createFinderFixture();
        const sidebar = createWebSidebar({
            document: fixture.dom.window.document,
            mount: fixture.mount,
            state: fixture.state,
            runCommand: command => { fixture.commands.push(command); },
            navigate: sessionId => { fixture.navigated.push(sessionId); }
        });
        await Promise.resolve();
        await Promise.resolve();

        const input = sidebar.element.querySelector('.agent-web-sidebar-input.is-session-search') as HTMLInputElement;
        expect(input).toBeTruthy();
        const sessionRows = (): HTMLElement[] =>
            Array.from(sidebar.element.querySelectorAll('.is-session')) as HTMLElement[];
        const groups = (): string[] =>
            Array.from(sidebar.element.querySelectorAll('.agent-web-sidebar-group')).map(node => node.textContent || '');
        expect(sessionRows().length).toEqual(3);
        expect(groups().length).toEqual(2);
        expect(groups()[0]).toEqual('Today');
        expect(groups()[1]).toEqual('Older');

        input.value = 'review';
        input.dispatchEvent(new fixture.dom.window.Event('input', { bubbles: true }));
        expect(sessionRows().length).toEqual(1);
        expect(sessionRows()[0].textContent).toContain('Reviewer');
        expect(sidebar.element.querySelector('.is-search-all')).toBeNull();

        input.dispatchEvent(new fixture.dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(fixture.navigated).toEqual(['other']);

        input.dispatchEvent(new fixture.dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(input.value).toEqual('');
        expect(sessionRows().length).toEqual(3);

        sidebar.focusSessionSearch();
        expect(fixture.dom.window.document.activeElement).toBe(input);

        input.value = 'zzz';
        input.dispatchEvent(new fixture.dom.window.Event('input', { bubbles: true }));
        expect(sessionRows().length).toEqual(0);
        const searchAll = sidebar.element.querySelector('.is-search-all') as HTMLElement;
        expect(searchAll.textContent).toContain('Search all messages for "zzz"');
        searchAll.dispatchEvent(new fixture.dom.window.MouseEvent('click', { bubbles: true }));
        expect(fixture.commands).toEqual(['/search zzz']);

        sidebar.dispose();
    }

    @Test('project finder filters projects and scopes the session list')
    async projectFilter() {
        const fixture = createFinderFixture();
        const sidebar = createWebSidebar({
            document: fixture.dom.window.document,
            mount: fixture.mount,
            state: fixture.state,
            runCommand: command => { fixture.commands.push(command); },
            navigate: sessionId => { fixture.navigated.push(sessionId); }
        });
        await Promise.resolve();
        await Promise.resolve();

        const toggle = sidebar.element.querySelector('.agent-web-sidebar-project-toggle') as HTMLElement;
        const panel = sidebar.element.querySelector('.agent-web-sidebar-project-panel') as HTMLElement;
        const projectInput = sidebar.element.querySelector('.agent-web-sidebar-input.is-project') as HTMLInputElement;
        expect(toggle.textContent).toContain('All projects');
        expect(panel.hidden).toEqual(true);

        toggle.dispatchEvent(new fixture.dom.window.MouseEvent('click', { bubbles: true }));
        expect(panel.hidden).toEqual(false);
        expect(toggle.getAttribute('aria-expanded')).toEqual('true');
        const projectRows = (): HTMLElement[] =>
            Array.from(sidebar.element.querySelectorAll('.agent-web-sidebar-row.is-project-row')) as HTMLElement[];
        expect(projectRows().length).toEqual(3);

        projectInput.value = 'bet';
        projectInput.dispatchEvent(new fixture.dom.window.Event('input', { bubbles: true }));
        expect(projectRows().map(row => row.querySelector('.agent-web-sidebar-main')?.textContent))
            .toEqual(['All projects', 'beta']);

        (projectRows()[1] as HTMLElement).dispatchEvent(new fixture.dom.window.MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();
        expect(projectInput.value).toEqual('bet');
        const sessionRows = (): HTMLElement[] =>
            Array.from(sidebar.element.querySelectorAll('.is-session')) as HTMLElement[];
        expect(sessionRows().length).toEqual(2);
        expect(toggle.textContent).toContain('beta');
        expect(toggle.classList.contains('is-filtered')).toEqual(true);

        sidebar.setProjectFilter('');
        await Promise.resolve();
        await Promise.resolve();
        expect(toggle.textContent).toContain('All projects');
        expect(sessionRows().length).toEqual(3);

        toggle.dispatchEvent(new fixture.dom.window.MouseEvent('click', { bubbles: true }));
        projectInput.value = '';
        projectInput.dispatchEvent(new fixture.dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(panel.hidden).toEqual(true);

        sidebar.dispose();
    }

    @Test('footer routes settings and the session header creates a new session')
    async settingsAndNewSession() {
        const fixture = createFinderFixture();
        const sidebar = createWebSidebar({
            document: fixture.dom.window.document,
            mount: fixture.mount,
            state: fixture.state,
            runCommand: command => { fixture.commands.push(command); },
            navigate: sessionId => { fixture.navigated.push(sessionId); }
        });
        await Promise.resolve();
        await Promise.resolve();

        const actions = Array.from(sidebar.element.querySelectorAll('.agent-web-sidebar-action')) as HTMLElement[];
        expect(actions.map(action => action.querySelector('.agent-web-sidebar-action-label')?.textContent))
            .toEqual(['Work', 'Inbox', 'Settings']);
        actions[2].dispatchEvent(new fixture.dom.window.MouseEvent('click', { bubbles: true }));
        expect(fixture.commands).toEqual(['/settings']);

        const add = sidebar.element.querySelector('.agent-web-sidebar-add') as HTMLElement;
        expect(add.getAttribute('aria-label')).toEqual('New session');
        add.dispatchEvent(new fixture.dom.window.MouseEvent('click', { bubbles: true }));
        expect(fixture.commands).toEqual(['/settings', '/new']);

        sidebar.dispose();
    }
}

@Suite('web agent sidebar settings entry')
export class WebAgentSidebarSettingsTest {
    @Test('the gear opens the settings page when the host provides one')
    async opensSettingsPage() {
        const fixture = createFinderFixture();
        let opened = 0;
        const sidebar = createWebSidebar({
            document: fixture.dom.window.document,
            mount: fixture.mount,
            state: fixture.state,
            runCommand: command => { fixture.commands.push(command); },
            navigate: sessionId => { fixture.navigated.push(sessionId); },
            openSettingsPage: () => { opened += 1; }
        });
        await Promise.resolve();
        await Promise.resolve();
        const actions = Array.from(sidebar.element.querySelectorAll('.agent-web-sidebar-action')) as HTMLElement[];
        const settings = actions.find(action => (action.textContent || '').includes('Settings')) as HTMLElement;
        settings.dispatchEvent(new fixture.dom.window.MouseEvent('click', { bubbles: true }));
        expect(opened).toEqual(1);
        // The page owns the settings surface; the overlay command is not run.
        expect(fixture.commands).toEqual([]);
        sidebar.dispose();
    }

    @Test('without a page host the gear keeps the /settings command')
    async fallsBackToCommand() {
        const fixture = createFinderFixture();
        const sidebar = createWebSidebar({
            document: fixture.dom.window.document,
            mount: fixture.mount,
            state: fixture.state,
            runCommand: command => { fixture.commands.push(command); },
            navigate: sessionId => { fixture.navigated.push(sessionId); }
        });
        await Promise.resolve();
        await Promise.resolve();
        const actions = Array.from(sidebar.element.querySelectorAll('.agent-web-sidebar-action')) as HTMLElement[];
        const settings = actions.find(action => (action.textContent || '').includes('Settings')) as HTMLElement;
        settings.dispatchEvent(new fixture.dom.window.MouseEvent('click', { bubbles: true }));
        expect(fixture.commands).toEqual(['/settings']);
        sidebar.dispose();
    }
}
