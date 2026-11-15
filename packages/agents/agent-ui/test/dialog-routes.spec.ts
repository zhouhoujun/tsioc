import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AGENT_CONSOLE_DIALOG_ROUTES, buildAgentConsoleDialogRouteLines, groupAgentConsoleDialogRoutes, listAgentConsoleDialogRoutes, resolveAgentConsoleDialogRoute } from '../src/AgentConsoleDialogRoutes';
import { runHelpCommand } from '../src/AgentConsoleHelpCommand';
import { openAgentConsoleDialogDeepLink } from '../web-console/dialog-deeplink';
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

    @Test('aliases and unique prefixes resolve, ambiguous prefixes do not')
    aliasesAndPrefixes() {
        expect(resolveAgentConsoleDialogRoute('/models')?.id).toEqual('model');
        expect(resolveAgentConsoleDialogRoute('security')?.id).toEqual('permissions');
        expect(resolveAgentConsoleDialogRoute('worktrees')?.id).toEqual('worktree');
        expect(resolveAgentConsoleDialogRoute('sess')?.id).toEqual('sessions');
        // ambigous: 't' matches theme/tools/threads
        expect(resolveAgentConsoleDialogRoute('t')).toBeUndefined();
    }

    @Test('catalogue buckets every route once in declared group order')
    catalogue() {
        const buckets = groupAgentConsoleDialogRoutes();
        expect(buckets.map(bucket => bucket.group)).toEqual(['navigation', 'model', 'tools', 'session', 'extensions', 'settings']);
        const ids = buckets.flatMap(bucket => bucket.routes.map(route => route.id));
        expect(ids.length).toEqual(AGENT_CONSOLE_DIALOG_ROUTES.length);
        expect(new Set(ids).size).toEqual(AGENT_CONSOLE_DIALOG_ROUTES.length);
    }

    @Test('/help dialogs opens the route catalogue')
    async helpDialogs() {
        const overlays: Array<{ title: string; lines: string[] }> = [];
        const ctx: any = {
            translator: null,
            notify: () => undefined,
            select: async () => '',
            state: { openTextOverlay: (title: string, lines: string[]) => { overlays.push({ title, lines }); } }
        };
        await runHelpCommand(ctx, 'dialogs');
        expect(overlays.length).toEqual(1);
        expect(overlays[0].title).toEqual('Dialog routes');
        const body = overlays[0].lines.join('\n');
        expect(body).toContain('[navigation]');
        expect(body).toContain('model');
        expect(buildAgentConsoleDialogRouteLines('model').join('\n')).not.toContain('[tools]');
    }

    @Test('web deep link dispatches the route command and rejects unknown routes')
    webDeepLink() {
        const executed: string[] = [];
        const notices: string[] = [];
        const host = {
            translator: null,
            handleCommand: async (command: string) => { executed.push(command); return true; },
            notify: (message: string) => { notices.push(message); }
        };
        openAgentConsoleDialogDeepLink({ ...host, dialog: 'theme' });
        expect(executed).toEqual(['/theme']);
        openAgentConsoleDialogDeepLink({ ...host, dialog: 'definitely-not-a-route' });
        expect(executed.length).toEqual(1);
        expect(notices.join(' ')).toContain('definitely-not-a-route');
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
