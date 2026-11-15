import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AGENT_CONSOLE_DIALOG_ROUTES, listAgentConsoleDialogRoutes, resolveAgentConsoleDialogRoute } from '../src/AgentConsoleDialogRoutes';
import { handleDialogCommand } from '../src/AgentConsoleDialogCommands';

@Suite('dialog routes')
export class DialogRoutesTest {
    @Test('ids and paths are unique and resolve')
    resolves() {
        const ids = AGENT_CONSOLE_DIALOG_ROUTES.map(route => route.id);
        const paths = AGENT_CONSOLE_DIALOG_ROUTES.map(route => route.path);
        expect(new Set(ids).size).toEqual(ids.length);
        expect(new Set(paths).size).toEqual(paths.length);
        expect(resolveAgentConsoleDialogRoute('model')?.command).toEqual('/model');
        expect(resolveAgentConsoleDialogRoute('/model')?.id).toEqual('model');
        expect(resolveAgentConsoleDialogRoute('tools')?.id).toEqual('tools');
        expect(resolveAgentConsoleDialogRoute('nope')).toBeUndefined();
        expect(listAgentConsoleDialogRoutes('settings').map(route => route.id)).toEqual(['settings', 'theme']);
    }

    @Test('dispatches a route and lists the catalog')
    async dispatches() {
        let executed = '';
        let overlay: any;
        const ctx: any = {
            translator: null,
            notify: () => undefined,
            executeCommand: async (command: string) => { executed = command; return true; },
            state: { openTextOverlay: (_title: string, lines: string[]) => { overlay = lines; } }
        };
        await handleDialogCommand(ctx, 'model');
        expect(executed).toEqual('/model');
        await handleDialogCommand(ctx, '');
        expect(overlay.some((line: string) => line.includes('model'))).toEqual(true);
        await handleDialogCommand(ctx, 'nope');
        expect(executed).toEqual('/model');
    }
}
