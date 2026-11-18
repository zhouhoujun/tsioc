import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createConsole, RuntimeStub, SchedulerStub } from './_helpers';
import { handleSettingsCenterKey, selectSettingsCenterSection } from '../src/AgentConsoleSettingsCenter';
import { AgentConsoleSettingsCenterPanelComponent } from '../src/AgentConsoleSettingsCenterPanel';

@Suite('agent console settings center')
export class AgentConsoleSettingsCenterTest {
    private async createConsoleWithPersist(): Promise<{ component: any; state: any; persisted: any[] }> {
        const component: any = createConsole(new RuntimeStub(), new SchedulerStub());
        const persisted: any[] = [];
        component.persistSettings = async (patch: any) => { persisted.push(patch); };
        await component.onInit();
        return { component, state: component.sessionState, persisted };
    }

    @Test('/settings opens the center with the general section rows')
    async opensCenter() {
        const { component, state } = await this.createConsoleWithPersist();
        await component.handleCommand('/settings');
        expect(state.settingsCenterOpen).toEqual(true);
        expect(state.settingsCenterSection).toEqual('general');
        expect(state.settingsCenterTitle).toEqual('Settings · General');
        const ids = state.settingsCenterRows.map((row: any) => row.id);
        expect(ids).toContain('theme');
        expect(ids).toContain('steer');
        expect(ids).toContain('touch');
        expect(state.settingsCenterRows[0].selected).toEqual(true);
    }

    @Test('a query searches every section and shows the matching row')
    async searchQuery() {
        const { component, state } = await this.createConsoleWithPersist();
        await component.handleCommand('/settings model');
        expect(state.settingsCenterOpen).toEqual(true);
        const ids = state.settingsCenterRows.map((row: any) => row.id);
        expect(ids).toContain('model');
        expect(ids).not.toContain('theme');
        expect(state.settingsCenterTitle).toContain('search');
    }

    @Test('typing filters, escape clears the query then closes')
    async typingAndEscape() {
        const { component, state } = await this.createConsoleWithPersist();
        await component.handleCommand('/settings');
        await handleSettingsCenterKey(component, 't', 't');
        await handleSettingsCenterKey(component, 'h', 'h');
        expect(state.settingsCenterQuery).toEqual('th');
        const ids = state.settingsCenterRows.map((row: any) => row.id);
        expect(ids).toEqual(expect.arrayContaining(['theme', 'thinking']));
        await handleSettingsCenterKey(component, 'escape');
        expect(state.settingsCenterOpen).toEqual(true);
        expect(state.settingsCenterQuery).toEqual('');
        await handleSettingsCenterKey(component, 'escape');
        expect(state.settingsCenterOpen).toEqual(false);
    }

    @Test('enter applies the selected toggle and persists it')
    async appliesToggle() {
        const { component, state, persisted } = await this.createConsoleWithPersist();
        await component.handleCommand('/settings');
        const index = state.settingsCenterRows.findIndex((row: any) => row.id === 'steer');
        expect(index).toBeGreaterThanOrEqual(0);
        state.settingsCenterIndex = index;
        await handleSettingsCenterKey(component, 'return');
        expect(state.steerMode).toEqual(true);
        expect(persisted[persisted.length - 1]).toEqual({ steerMode: true });
        // The page stays open for further edits and refreshes the value text.
        expect(state.settingsCenterOpen).toEqual(true);
        expect(state.settingsCenterRows.find((row: any) => row.id === 'steer').value).toEqual('on');
    }

    @Test('ctrl+r restores the declared default of a toggle')
    async resetsToggle() {
        const { component, state } = await this.createConsoleWithPersist();
        await component.handleCommand('/settings');
        const index = state.settingsCenterRows.findIndex((row: any) => row.id === 'vim');
        state.settingsCenterIndex = index;
        await handleSettingsCenterKey(component, 'return');
        expect(state.vimMode).toEqual(true);
        await handleSettingsCenterKey(component, 'ctrl+r');
        expect(state.vimMode).toEqual(false);
    }

    @Test('left/right switches sections and keeps the page open')
    async switchesSections() {
        const { component, state } = await this.createConsoleWithPersist();
        await component.handleCommand('/settings');
        await handleSettingsCenterKey(component, 'right');
        expect(state.settingsCenterSection).toEqual('model');
        expect(state.settingsCenterTitle).toContain('Model');
        expect(state.settingsCenterRows.map((row: any) => row.id)).toContain('thinkingLevel');
        await handleSettingsCenterKey(component, 'left');
        expect(state.settingsCenterSection).toEqual('general');
    }

    @Test('action rows close the page before opening their dialog')
    async actionRowClosesPage() {
        const { component, state } = await this.createConsoleWithPersist();
        await component.handleCommand('/settings');
        const index = state.settingsCenterRows.findIndex((row: any) => row.id === 'theme');
        state.settingsCenterIndex = index;
        state.settingsCenterRows[index].selected = true;
        // Selecting a row that opens a picker must not stack two overlays.
        const pending = handleSettingsCenterKey(component, 'return');
        await Promise.resolve();
        await Promise.resolve();
        expect(state.settingsCenterOpen).toEqual(false);
        await state.cancelSelectMenu();
        await pending;
    }

    @Test('terminal keys reach the center before the composer')
    async terminalKeys() {
        const { component, state } = await this.createConsoleWithPersist();
        await component.handleCommand('/settings');
        await (component as any).handleTerminalInput({ text: '', partial: false }, '\u001b[B');
        await (component as any).handleTerminalInput({ text: '', partial: false }, '\u001b[B');
        expect(state.settingsCenterRows[state.settingsCenterIndex].id).toEqual('vim');
        await (component as any).handleTerminalInput({ text: '', controlKey: 'return', partial: false }, '\r');
        expect(state.vimMode).toEqual(true);
        expect(state.settingsCenterOpen).toEqual(true);
        // reopen and check typing appends to the query instead of the composer
        await component.handleCommand('/settings');
        await (component as any).handleTerminalInput({ text: 'st', partial: false }, 'st');
        expect(state.settingsCenterQuery).toEqual('st');
        expect(state.input).toEqual('');
        expect(state.settingsCenterRows.some((row: any) => row.id === 'steer')).toEqual(true);
    }

    @Test('queue mode and transcript window rows persist their values')
    async newDisplayFields() {
        const { component, state, persisted } = await this.createConsoleWithPersist();
        await component.handleCommand('/settings');
        const queueIndex = state.settingsCenterRows.findIndex((row: any) => row.id === 'queueMode');
        expect(queueIndex).toBeGreaterThanOrEqual(0);
        state.settingsCenterIndex = queueIndex;
        await handleSettingsCenterKey(component, 'return');
        expect(component.options.ui.queueMode).toEqual(false);
        expect(persisted[persisted.length - 1]).toEqual({ queueMode: false });

        await component.handleCommand('/settings');
        const windowIndex = state.settingsCenterRows.findIndex((row: any) => row.id === 'transcriptWindow');
        state.settingsCenterIndex = windowIndex;
        component.select = async () => '80';
        await handleSettingsCenterKey(component, 'return');
        expect(state.consoleOptions.transcriptWindowMessages).toEqual(80);
        expect(persisted[persisted.length - 1]).toEqual({ transcriptWindowMessages: 80 });
    }

    @Test('approval timeout applies to the policy and persists milliseconds')
    async approvalTimeoutRow() {
        const { component, state, persisted } = await this.createConsoleWithPersist();
        await component.handleCommand('/settings permissions');
        const index = state.settingsCenterRows.findIndex((row: any) => row.id === 'approvalTimeout');
        expect(index).toBeGreaterThanOrEqual(0);
        state.settingsCenterIndex = index;
        component.select = async () => '60';
        await handleSettingsCenterKey(component, 'return');
        expect(component.options.policy.limits.approvalTimeoutMs).toEqual(60000);
        expect(persisted[persisted.length - 1]).toEqual({ approvalTimeoutMs: 60000 });
        await component.handleCommand('/settings permissions');
        const row = state.settingsCenterRows.find((item: any) => item.id === 'approvalTimeout');
        expect(row.value).toEqual('60s');
    }

    @Test('the MCP activation picker closes the page before stacking a dialog')
    async mcpPickerClosesPage() {
        const { component, state } = await this.createConsoleWithPersist();
        state.tools = [{ name: 'mcp.fs.read', active: false, activeActivation: true } as any];
        await component.handleCommand('/settings mcp');
        const index = state.settingsCenterRows.findIndex((row: any) => row.id === 'mcpToolActivate');
        expect(index).toBeGreaterThanOrEqual(0);
        state.settingsCenterIndex = index;
        const opened: string[] = [];
        component.select = async (title: string) => { opened.push(title); return undefined; };
        await handleSettingsCenterKey(component, 'return');
        expect(opened.length).toEqual(1);
        expect(state.settingsCenterOpen).toEqual(false);
    }

    @Test('the section strip switches sections and delegates clicks')
    async sectionStrip() {
        const { component, state } = await this.createConsoleWithPersist();
        await component.handleCommand('/settings');
        expect(typeof state.settingsCenterSectionPickAction).toEqual('function');
        selectSettingsCenterSection(component, 'permissions');
        expect(state.settingsCenterSection).toEqual('permissions');
        expect(state.settingsCenterRows.some((row: any) => row.id === 'workspaceTrust')).toEqual(true);

        const panel = new AgentConsoleSettingsCenterPanelComponent(state, undefined);
        const picked: string[] = [];
        state.settingsCenterSectionPickAction = (id: string) => { picked.push(id); };
        panel.pickSection('data');
        expect(picked).toEqual(['data']);
        expect(panel.sectionEntries.find(entry => entry.active)?.id).toEqual('permissions');
    }

    @Test('message page size applies to the console options and persists')
    async pagerSizeRow() {
        const { component, state, persisted } = await this.createConsoleWithPersist();
        await component.handleCommand('/settings');
        const index = state.settingsCenterRows.findIndex((row: any) => row.id === 'pagerSize');
        expect(index).toBeGreaterThanOrEqual(0);
        state.settingsCenterIndex = index;
        component.select = async () => '10';
        await handleSettingsCenterKey(component, 'return');
        expect(state.consoleOptions.messageSelectionPageSize).toEqual(10);
        expect(persisted[persisted.length - 1]).toEqual({ messageSelectionPageSize: 10 });
    }

    @Test('search results name the section each row belongs to')
    async searchResultsCarrySection() {
        const { component, state } = await this.createConsoleWithPersist();
        await component.handleCommand('/settings trust');
        const row = state.settingsCenterRows.find((item: any) => item.id === 'workspaceTrust');
        expect(row).toBeTruthy();
        expect(row.description).toContain('Permissions');
    }

    @Test('/settings menu still opens the classic tab menu')
    async classicMenuFallback() {
        const { component, state } = await this.createConsoleWithPersist();
        const pending = component.handleCommand('/settings menu');
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(state.selectMenu?.title).toEqual('Settings');
        expect(state.settingsCenterOpen).toEqual(false);
        if (state.selectMenu) {
            await state.cancelSelectMenu();
        }
        await pending.catch(() => undefined);
    }
}
