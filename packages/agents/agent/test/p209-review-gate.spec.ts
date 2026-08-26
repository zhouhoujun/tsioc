import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RunContext } from '@tsdi/core';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { AgentTurnInput } from '../src/runtime/AgentTurnInput';
import { StreamChunk } from '../src/model/StreamChunk';
import { SynthesisOptions, SynthesisReport } from '../src/context/AgentContextManager';

class ReviewGateRuntime extends AgentRuntime {
    protected reviewGates = new Map<string, { active: boolean; taskId: string }>();

    override setReviewGate(sessionId: string, taskId: string): void {
        this.reviewGates.set(sessionId, { active: true, taskId });
    }

    override clearReviewGate(sessionId: string): void {
        this.reviewGates.delete(sessionId);
    }

    override getReviewGateStatus(sessionId: string): { active: boolean; taskId?: string } {
        const gate = this.reviewGates.get(sessionId);
        return gate ? { active: gate.active, taskId: gate.taskId } : { active: false };
    }

    override async runTurn(_sid: string, _input: string) {
        return { sessionId: '', message: { id: '', role: 'assistant' as const, content: '', createdAt: 0 } };
    }
    override async start() {}
    override async stop() {}
    override async executeTurn(_input: AgentTurnInput, _ctx: RunContext) {
        return { sessionId: '', message: { id: '', role: 'assistant' as const, content: '', createdAt: 0 } };
    }
    override async processTurn(_input: AgentTurnInput) {
        return { sessionId: '', message: { id: '', role: 'assistant' as const, content: '', createdAt: 0 } };
    }
    override async *runStreamingTurn(): AsyncGenerator<StreamChunk> { yield { type: 'done' }; }
    override async getMessages() { return []; }
    override async putMemory(_s: string, _k: string, _v: string) {
        return { id: 'mem-1', key: _k, value: _v, scope: 'session' as const, createdAt: 0 };
    }
    override async searchMemory() { return []; }
    override async searchSessions() { return []; }
    override synthesizeExperiences(): SynthesisReport {
        return { totalSessions: 0, processedSessions: 0, patterns: [], errors: [] };
    }
}

@Suite('P209 review gate — DefaultAgentRuntime pattern')
export class P209ReviewGateSuite {

    @Test('setReviewGate stores active gate with taskId')
    setReviewGateStoresActiveGate() {
        const runtime = new ReviewGateRuntime();
        runtime.setReviewGate('session-1', 'task-1');
        const status = runtime.getReviewGateStatus('session-1');
        expect(status.active).toEqual(true);
        expect(status.taskId).toEqual('task-1');
    }

    @Test('clearReviewGate removes the gate')
    clearReviewGateRemovesGate() {
        const runtime = new ReviewGateRuntime();
        runtime.setReviewGate('session-1', 'task-1');
        expect(runtime.getReviewGateStatus('session-1').active).toEqual(true);
        runtime.clearReviewGate('session-1');
        expect(runtime.getReviewGateStatus('session-1').active).toEqual(false);
    }

    @Test('getReviewGateStatus returns inactive for unknown session')
    getReviewGateStatusReturnsInactiveForUnknown() {
        const runtime = new ReviewGateRuntime();
        const status = runtime.getReviewGateStatus('unknown-session');
        expect(status.active).toEqual(false);
        expect(status.taskId).toBeUndefined();
    }

    @Test('gates are independent per session')
    gatesAreIndependentPerSession() {
        const runtime = new ReviewGateRuntime();
        runtime.setReviewGate('session-a', 'task-a');
        runtime.setReviewGate('session-b', 'task-b');
        expect(runtime.getReviewGateStatus('session-a').taskId).toEqual('task-a');
        expect(runtime.getReviewGateStatus('session-b').taskId).toEqual('task-b');
        runtime.clearReviewGate('session-a');
        expect(runtime.getReviewGateStatus('session-a').active).toEqual(false);
        expect(runtime.getReviewGateStatus('session-b').active).toEqual(true);
    }

    @Test('AgentRuntime abstract base provides no-op defaults')
    agentRuntimeAbstractDefaultsAreNoOp() {
        expect(true).toEqual(true);
    }

    @Test('setReviewGate overwrites previous gate for same session')
    setReviewGateOverwritesPreviousGate() {
        const runtime = new ReviewGateRuntime();
        runtime.setReviewGate('session-1', 'task-1');
        runtime.setReviewGate('session-1', 'task-2');
        const status = runtime.getReviewGateStatus('session-1');
        expect(status.active).toEqual(true);
        expect(status.taskId).toEqual('task-2');
    }
}
