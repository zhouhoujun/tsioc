import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createConsole, RuntimeStub, SchedulerStub, ToolRegistryStub } from './_helpers';

@Suite('/check LSP diagnostics panel')
export class LspDiagnosticsCommandTest {
    @Test('formats errors/warnings and resolves workspace-relative paths')
    async formatsDiagnostics() {
        const tools = new ToolRegistryStub();
        const calls: Array<{ name: string; input: any }> = [];
        tools.invoke = async (name: string, input?: any) => {
            calls.push({ name, input });
            return {
                available: true,
                filePath: input.filePath,
                diagnosticCount: 2,
                diagnostics: [
                    { severity: 1, message: 'Cannot find name main', source: 'ts', code: 2304, startLine: 9, startCharacter: 4 },
                    { severity: 2, message: 'unused import', source: 'ts', code: 6133, startLine: 14, startCharacter: 0 }
                ]
            };
        };
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), tools);
        component.sessionState.workspace = '/w';
        await component.onInit();

        await (component as any).handleCommand('/check src/a.ts');

        const lspCall = calls.find(call => call.name === 'lsp_diagnostics');
        expect(lspCall?.input).toEqual({ filePath: '/w/src/a.ts' });
        const overlay = component.sessionState.textOverlay;
        expect(overlay?.title).toEqual('LSP diagnostics');
        const text = overlay?.lines.join('\n') || '';
        expect(text).toContain('1 errors · 1 warnings · 2 diagnostics');
        expect(text).toContain('error 10:5 Cannot find name main (ts/2304)');
        expect(text).toContain('warning 15:1 unused import (ts/6133)');
    }

    @Test('reports a missing server and keeps other files going')
    async reportsUnavailableServer() {
        const tools = new ToolRegistryStub();
        tools.invoke = async (_name: string, input?: any) => {
            if (String(input?.filePath).endsWith('.py')) {
                return { available: false, message: 'No LSP server configured for .py files.' };
            }
            return { available: true, filePath: input.filePath, diagnosticCount: 0, diagnostics: [] };
        };
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), tools);
        component.sessionState.workspace = '/w';
        await component.onInit();

        await (component as any).handleCommand('/check a.ts b.py');

        const text = component.sessionState.textOverlay?.lines.join('\n') || '';
        expect(text).toContain('/w/a.ts: no diagnostics.');
        expect(text).toContain('No LSP server configured for .py files.');
    }

    @Test('without arguments prints usage and never invokes a tool')
    async usageOnly() {
        const tools = new ToolRegistryStub();
        const invoked: string[] = [];
        tools.invoke = async (name: string) => { invoked.push(name); return undefined; };
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), tools);
        await component.onInit();

        await (component as any).handleCommand('/check');

        expect(invoked).not.toContain('lsp_diagnostics');
        expect(component.notice).toContain('Usage: /check <file>');
    }

    @Test('/lsp is an alias and tool failures stay inside the panel')
    async aliasAndFailure() {
        const tools = new ToolRegistryStub();
        tools.invoke = async () => { throw new Error('server crashed'); };
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), tools);
        component.sessionState.workspace = '/w';
        await component.onInit();

        await (component as any).handleCommand('/lsp src/a.ts');

        const text = component.sessionState.textOverlay?.lines.join('\n') || '';
        expect(text).toContain('server crashed');
    }
}
