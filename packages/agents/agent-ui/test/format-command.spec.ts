import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createConsole, RuntimeStub, SchedulerStub, ToolRegistryStub } from './_helpers';
import { parseFormatCommandArgs } from '../src/AgentConsoleFormatCommand';

@Suite('/format LSP formatter command')
export class FormatCommandTest {
    @Test('parses --check/--dry-run without dropping file paths')
    parsesArgs() {
        expect(parseFormatCommandArgs('a.ts --check b.ts')).toEqual({ files: ['a.ts', 'b.ts'], write: false });
        expect(parseFormatCommandArgs('--write a.ts')).toEqual({ files: ['a.ts'], write: true });
        expect(parseFormatCommandArgs('')).toEqual({ files: [], write: true });
    }

    @Test('formats files and reports written edits')
    async writesFormattedFiles() {
        const tools = new ToolRegistryStub();
        const calls: Array<{ name: string; input: any }> = [];
        tools.invoke = async (name: string, input?: any) => {
            calls.push({ name, input });
            return { available: true, changed: true, written: true, editCount: 2 };
        };
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), tools);
        component.sessionState.workspace = '/w';
        await component.onInit();

        await (component as any).handleCommand('/format src/a.ts');

        const call = calls.find(item => item.name === 'lsp_format');
        expect(call?.input).toEqual({ filePath: '/w/src/a.ts', write: true });
        const text = component.sessionState.textOverlay?.lines.join('\n') || '';
        expect(text).toContain('/w/src/a.ts: 2 edits written.');
        expect(text).toContain('1 files changed · 0 unchanged');
    }

    @Test('--check previews without writing and keeps going after failures')
    async previewsAndContinues() {
        const tools = new ToolRegistryStub();
        const calls: Array<{ name: string; input: any }> = [];
        tools.invoke = async (name: string, input?: any) => {
            if (name !== 'lsp_format') return undefined;
            calls.push({ name, input });
            if (String(input.filePath).endsWith('.py')) {
                throw new Error('server crashed');
            }
            if (String(input.filePath).endsWith('.css')) {
                return { available: false, message: 'No LSP server configured for .css files.' };
            }
            return { available: true, changed: true, written: false, editCount: 1 };
        };
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), tools);
        component.sessionState.workspace = '/w';
        await component.onInit();

        await (component as any).handleCommand('/format src/a.ts b.py c.css --check');

        expect(calls.every(item => item.input.write === false)).toEqual(true);
        const text = component.sessionState.textOverlay?.lines.join('\n') || '';
        expect(text).toContain('/w/src/a.ts: 1 edits (preview only).');
        expect(text).toContain('server crashed');
        expect(text).toContain('No LSP server configured for .css files.');
        expect(text).toContain('1 files changed · 0 unchanged');
    }

    @Test('reports already formatted files and usage without arguments')
    async unchangedAndUsage() {
        const tools = new ToolRegistryStub();
        const invoked: string[] = [];
        tools.invoke = async (name: string) => { invoked.push(name); return { available: true, changed: false, written: false, editCount: 0 }; };
        const component = createConsole(new RuntimeStub(), new SchedulerStub(), tools);
        component.sessionState.workspace = '/w';
        await component.onInit();

        await (component as any).handleCommand('/fmt src/a.ts');
        expect(component.sessionState.textOverlay?.lines.join('\n')).toContain('/w/src/a.ts: already formatted.');

        invoked.length = 0;
        await (component as any).handleCommand('/format');
        expect(invoked).not.toContain('lsp_format');
        expect(component.notice).toContain('Usage: /format <file>');
    }
}
