import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createConsoleParts, RuntimeStub, SchedulerStub, ToolRegistryStub } from './_helpers';

function build(runtime: RuntimeStub) {
    const scheduler = new SchedulerStub();
    const parts = createConsoleParts(runtime, scheduler, new ToolRegistryStub());
    parts.state.configure({ sessionId: 'session-1' } as any);
    parts.sessionService.loadMessagesHandlers.set('session-1', async () => []);
    return parts;
}

@Suite('turn undo/redo commands')
export class TurnUndoCommandTest {
    @Test('/undo reverts the turn, restores the prompt and reloads messages')
    async undoTurn() {
        const runtime = new RuntimeStub();
        (runtime as any).undoTurn = async (sessionId: string) => {
            runtime.calls.push(`undo:turn:${sessionId}`);
            return { restored: true, prompt: 'write it', files: 2 };
        };
        const { state, component } = build(runtime);
        await (component as any).runUndoCommand();
        expect(runtime.calls).toContain('undo:turn:session-1');
        expect(state.input).toEqual('write it');
        expect(state.messages).toEqual([]);
    }

    @Test('/redo re-applies the undone turn')
    async redoTurn() {
        const runtime = new RuntimeStub();
        (runtime as any).redoTurn = async (sessionId: string) => {
            runtime.calls.push(`redo:turn:${sessionId}`);
            return { restored: true, prompt: 'write it', files: 2 };
        };
        const { state, component } = build(runtime);
        await (component as any).runRedoCommand();
        expect(runtime.calls).toContain('redo:turn:session-1');
        expect(state.input).toEqual('');
    }

    @Test('runtimes without turn checkpoints fall back to file undo')
    async fallsBackToFileUndo() {
        const runtime = new RuntimeStub();
        (runtime as any).undoTurn = async () => ({ restored: false });
        const { component } = build(runtime);
        await (component as any).runUndoCommand();
        expect(runtime.calls).toContain('undo:file');
    }
}
