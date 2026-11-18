import expect = require('expect');
import { AfterEach, BeforeEach, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentConsoleSessionState, AgentUiModule } from '../src';
import { mountAgentWebSettingsPage, type AgentWebSettingsPageHandle } from '../web-console/settings-page';

async function settle(times = 128): Promise<void> {
    for (let index = 0; index < times; index++) {
        await Promise.resolve();
    }
}

@Suite('web settings page')
export class AgentConsoleWebSettingsPageTest {
    ctx!: ApplicationContext;
    dom!: any;
    ref!: ComponentRef<AgentConsoleComponent>;
    page!: AgentWebSettingsPageHandle;

    @BeforeEach()
    async init() {
        const { JSDOM } = require('jsdom');
        this.dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        this.ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, AgentUiModule, HtmlTemplateModule, ComponentsModule],
            providers: [{ provide: DOCUMENT, useValue: this.dom.window.document }]
        });
        this.ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        this.page = await mountAgentWebSettingsPage({
            document: this.dom.window.document,
            state: this.ctx.get(AgentConsoleSessionState)
        });
    }

    @AfterEach()
    async clean() {
        await this.page?.dispose();
        await this.ctx?.close();
    }

    protected get instance(): any {
        return this.ref.instance;
    }

    protected get state(): any {
        return this.ref.instance.sessionState;
    }

    protected get pageElement(): HTMLElement {
        return this.page.element;
    }

    protected click(element: Element): void {
        element.dispatchEvent(new this.dom.window.MouseEvent('click', { bubbles: true }));
    }

    @Test('opens as a page with schema cards, switches and action buttons')
    async rendersPage() {
        await this.instance.openSettingsPage();
        await settle();
        const page = this.pageElement.querySelector('[data-settings-page]') as HTMLElement;
        expect(page).toBeTruthy();
        // `v-show` keeps the shell mounted; visibility is the semantic hidden state.
        expect(page.hasAttribute('hidden')).toEqual(false);
        expect(page.textContent).toContain('Settings · General');
        expect(page.querySelectorAll('.ui-card').length).toBeGreaterThan(3);
        // Toggles render as switches; picker rows render as action buttons.
        expect(page.querySelector('[data-settings-row="thinking"] .ui-switch')).toBeTruthy();
        expect(page.querySelector('[data-settings-row="thinking"] .ui-badge')).toBeTruthy();
        expect(page.querySelector('[data-settings-row="theme"] .ui-switch')).toBeFalsy();
        expect(page.querySelector('[data-settings-row="theme"] .ui-button')).toBeTruthy();
        const sections = Array.from(page.querySelectorAll('.settings-page-sections .ui-button'))
            .map(button => (button.textContent || '').trim());
        expect(sections).toContain('Permissions');
        expect(sections).toContain('Data & tooling');
        expect(this.state.settingsPageOpen).toEqual(true);
        expect(this.state.settingsCenterOpen).toEqual(false);
        // The console tree keeps its terminal nodes: the page is a separate app.
        const consoleRoot = this.ref.hostView.rootNodes[0] as unknown as HTMLElement;
        expect(consoleRoot.querySelector('[data-settings-page]')).toBeFalsy();
    }

    @Test('a switch applies the row and keeps the page open')
    async togglesSetting() {
        const before = this.state.showThinking === true;
        await this.instance.openSettingsPage();
        await settle();
        const row = this.pageElement.querySelector('[data-settings-row="thinking"]') as HTMLElement;
        this.click(row.querySelector('.ui-switch') as Element);
        await settle();
        expect(this.state.showThinking === true).toEqual(!before);
        expect(this.state.settingsPageOpen).toEqual(true);
        expect(this.pageElement.querySelector('[data-settings-page]')).toBeTruthy();
        // The row reflects the new value after the schema rebuild.
        const refreshed = this.pageElement.querySelector('[data-settings-row="thinking"]') as HTMLElement;
        expect(refreshed.textContent || '').toContain(before ? 'hidden' : 'shown');
    }

    @Test('search filters the schema and section buttons switch sections')
    async searchesAndSwitchesSections() {
        await this.instance.openSettingsPage();
        await settle();
        const page = this.pageElement.querySelector('[data-settings-page]') as HTMLElement;
        const input = page.querySelector('.settings-page-search .ui-field-input') as HTMLInputElement;
        input.value = 'permission';
        input.dispatchEvent(new this.dom.window.Event('input', { bubbles: true }));
        await settle();
        expect(this.state.settingsCenterQuery).toEqual('permission');
        const ids = (this.state.settingsCenterRows || []).map((row: any) => row.id);
        expect(ids).toContain('permissionsInspect');
        expect(ids).not.toContain('thinking');

        const permissions = Array.from(page.querySelectorAll('.settings-page-sections .ui-button'))
            .find(button => (button.textContent || '').trim() === 'Permissions') as HTMLElement;
        this.click(permissions);
        await settle();
        expect(this.state.settingsCenterSection).toEqual('permissions');
        expect((this.state.settingsCenterRows || []).some((row: any) => row.section === 'permissions')).toEqual(true);
    }

    @Test('the close affordance dismisses the page and reopening restores it')
    async closesAndReopens() {
        await this.instance.openSettingsPage();
        await settle();
        this.click(this.pageElement.querySelector('.settings-page-close') as Element);
        await settle();
        expect(this.state.settingsPageOpen).toEqual(false);
        const closed = this.pageElement.querySelector('[data-settings-page]') as HTMLElement;
        expect(closed.hasAttribute('hidden')).toEqual(true);
        await this.instance.openSettingsPage();
        await settle();
        const reopened = this.pageElement.querySelector('[data-settings-page]') as HTMLElement;
        expect(reopened.hasAttribute('hidden')).toEqual(false);
        // Esc is the keyboard close affordance.
        reopened.dispatchEvent(new this.dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await settle();
        expect(this.state.settingsPageOpen).toEqual(false);
    }
}
