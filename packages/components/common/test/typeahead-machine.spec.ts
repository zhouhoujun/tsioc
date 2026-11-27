import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    createTypeaheadMachineState,
    transitionTypeaheadMachine
} from '../typeahead/src/typeahead.machine';

function input(query: string, delayMs = 0, minChars = 1) {
    return { type: 'input.changed' as const, query, delayMs, minChars };
}

@Suite('common typeahead state machine')
export class TypeaheadMachineTest {
    @Test('debounces input before issuing a request and caches the answer')
    async debounceAndCache() {
        let state = createTypeaheadMachineState<string>();
        const first = transitionTypeaheadMachine(state, input('ab', 50));
        expect(first.state.status).toEqual('debouncing');
        expect(first.effects.map(effect => effect.type)).toEqual(['debounce']);

        const attempt = (first.effects[0] as any).attempt;
        const loading = transitionTypeaheadMachine(first.state, { type: 'debounce.elapsed', attempt });
        expect(loading.state.status).toEqual('loading');
        expect(loading.effects).toEqual([{ type: 'request', attempt, query: 'ab' }]);

        const ready = transitionTypeaheadMachine(loading.state, {
            type: 'request.succeeded',
            attempt,
            result: { items: ['a', 'b'] }
        });
        expect(ready.state.status).toEqual('ready');
        expect((ready.state as any).shown).toEqual(['a', 'b']);

        const cached = transitionTypeaheadMachine(ready.state, input('ab', 50));
        expect(cached.state.status).toEqual('ready');
        expect(cached.effects).toEqual([]);
        expect((cached.state as any).shown).toEqual(['a', 'b']);

        const other = transitionTypeaheadMachine(ready.state, input('abc', 50));
        const back = transitionTypeaheadMachine(other.state, input('ab', 50));
        expect(back.state.status).toEqual('ready');
        expect(back.effects.map(effect => effect.type)).toEqual(['cancel']);
        expect((back.state as any).shown).toEqual(['a', 'b']);
    }

    @Test('keeps stale rows while a new query is pending and ignores late answers')
    async staleAndLateAnswers() {
        let state = createTypeaheadMachineState<string>();
        const initial = transitionTypeaheadMachine(state, input('a'));
        const attempt = (initial.effects[0] as any).attempt;
        state = transitionTypeaheadMachine(initial.state, {
            type: 'request.succeeded',
            attempt,
            result: { items: ['alpha'] }
        }).state;

        const next = transitionTypeaheadMachine(state, input('ab'));
        expect(next.state.status).toEqual('loading');
        expect((next.state as any).stale).toEqual(true);
        expect((next.state as any).shown).toEqual(['alpha']);
        const nextAttempt = (next.effects.find(effect => effect.type === 'request') as any).attempt;

        const late = transitionTypeaheadMachine(next.state, {
            type: 'request.succeeded',
            attempt,
            result: { items: ['stale'] }
        });
        expect(late.state).toBe(next.state);
        expect(late.effects).toEqual([]);

        const fresh = transitionTypeaheadMachine(next.state, {
            type: 'request.succeeded',
            attempt: nextAttempt,
            result: { items: ['alphabet'] }
        });
        expect((fresh.state as any).shown).toEqual(['alphabet']);
        expect((fresh.state as any).stale).toEqual(false);
    }

    @Test('failed requests retry and short queries clear the list')
    async failureAndMinChars() {
        let state = createTypeaheadMachineState<string>();
        const started = transitionTypeaheadMachine(state, input('bad'));
        const attempt = (started.effects[0] as any).attempt;
        state = transitionTypeaheadMachine(started.state, {
            type: 'request.failed',
            attempt,
            message: 'offline'
        }).state;
        expect(state.status).toEqual('failed');
        expect((state as any).error).toEqual('offline');

        const retry = transitionTypeaheadMachine(state, { type: 'retry.requested' });
        expect(retry.state.status).toEqual('loading');
        expect((retry.effects[0] as any).query).toEqual('bad');

        const short = transitionTypeaheadMachine(retry.state, input('a', 0, 2));
        expect(short.state.status).toEqual('ready');
        expect((short.state as any).shown).toEqual([]);
        expect(short.effects.map(effect => effect.type)).toContain('cancel');
    }

    @Test('dispose cancels pending work and becomes inert')
    async dispose() {
        const state = createTypeaheadMachineState<string>();
        const started = transitionTypeaheadMachine(state, input('a'));
        const disposed = transitionTypeaheadMachine(started.state, { type: 'disposed' });
        expect(disposed.state.status).toEqual('disposed');
        expect(disposed.effects).toEqual([{ type: 'cancel' }]);
        const inert = transitionTypeaheadMachine(disposed.state, input('b'));
        expect(inert.state).toBe(disposed.state);
        expect(inert.effects).toEqual([]);
    }
}
