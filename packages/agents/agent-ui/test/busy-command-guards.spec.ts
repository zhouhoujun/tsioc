import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { COMMAND_HANDLERS } from '../src/AgentConsoleCommandHandlers';

function metaFor(command: string, args: string[] = []) {
    return { command, matches: [command], parsedArgs: { values: args, resolved: args, diagnostics: [] } };
}

function busyContext() {
    const ran: string[] = [];
    const busy: string[] = [];
    const ctx: any = {
        isTurnInProgress: () => true,
        notifyBusyState: () => busy.push('busy'),
        runAttachCommand: async (arg: string) => { ran.push(`attach:${arg}`); return true; },
        runExportCommand: async (arg: string) => { ran.push(`export:${arg}`); return true; },
        openUsage: async (scope?: string) => { ran.push(`usage:${scope || ''}`); return true; },
        openWorktreeDiff: async (arg?: string) => { ran.push(`diff:${arg || ''}`); return true; },
        openScheduledJobsDashboard: async (arg?: string) => { ran.push(`jobs:${arg || ''}`); return true; },
        openCodingTaskInspector: async (arg?: string) => { ran.push(`tasks:${arg || ''}`); return true; },
        runUndoCommand: async () => { ran.push('undo'); return true; },
        runRedoCommand: async () => { ran.push('redo'); return true; },
        runPlanCommand: async (arg: string) => { ran.push(`plan:${arg}`); return true; }
    };
    return { ctx, ran, busy };
}

@Suite('commands available while a turn is running')
export class BusyCommandGuardTest {

    @Test('read-only commands run mid-turn instead of being blocked')
    async readOnlyCommandsRunMidTurn() {
        const { ctx, ran, busy } = busyContext();
        await COMMAND_HANDLERS['/attach'](ctx, 'clear', metaFor('/attach', ['clear']));
        await COMMAND_HANDLERS['/export'](ctx, 'json /tmp/x.json', metaFor('/export', ['json', '/tmp/x.json']));
        await COMMAND_HANDLERS['/usage'](ctx, '', metaFor('/usage'));
        await COMMAND_HANDLERS['/diff'](ctx, '', metaFor('/diff'));
        await COMMAND_HANDLERS['/jobs'](ctx, '', metaFor('/jobs'));
        await COMMAND_HANDLERS['/tasks'](ctx, '', metaFor('/tasks'));
        expect(busy).toEqual([]);
        expect(ran).toEqual([
            'attach:clear',
            'export:json /tmp/x.json',
            'usage:',
            'diff:',
            'jobs:',
            'tasks:'
        ]);
    }

    @Test('session-mutating commands keep the busy guard')
    async mutatingCommandsStayGuarded() {
        const { ctx, ran, busy } = busyContext();
        await COMMAND_HANDLERS['/undo'](ctx, '', metaFor('/undo'));
        await COMMAND_HANDLERS['/redo'](ctx, '', metaFor('/redo'));
        await COMMAND_HANDLERS['/plan'](ctx, 'on', metaFor('/plan', ['on']));
        expect(ran).toEqual([]);
        expect(busy.length).toEqual(3);
    }
}
