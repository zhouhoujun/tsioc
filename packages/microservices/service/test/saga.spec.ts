import expect = require('expect');
import { runSaga, SagaError } from '../src/saga';

describe('saga', () => {
    it('executes steps in order and returns completed names', async () => {
        const calls: string[] = [];
        const result = await runSaga([
            { name: 'reserve', execute: () => { calls.push('reserve'); } },
            { name: 'charge', execute: () => { calls.push('charge'); } }
        ], {});
        expect(calls).toEqual(['reserve', 'charge']);
        expect(result.completed).toEqual(['reserve', 'charge']);
    });

    it('compensates completed steps in reverse on failure', async () => {
        const calls: string[] = [];
        const step = (name: string) => ({
            name,
            execute: () => { calls.push(`do:${name}`); if (name === 'charge') throw new Error('declined'); },
            compensate: () => { calls.push(`undo:${name}`); }
        });

        let error: any;
        try {
            await runSaga([step('reserve'), step('charge'), step('ship')], {});
        } catch (err) {
            error = err;
        }
        expect(error).toBeInstanceOf(SagaError);
        expect(calls).toEqual(['do:reserve', 'do:charge', 'undo:reserve']);
        expect(error.failure).toMatchObject({
            failedStep: 'charge',
            completed: ['reserve'],
            compensated: ['reserve']
        });
    });

    it('collects compensation errors without hiding the original failure', async () => {
        let error: any;
        try {
            await runSaga([
                { name: 'first', execute: () => undefined, compensate: () => { throw new Error('undo failed'); } },
                { name: 'second', execute: () => { throw new Error('boom'); } }
            ], {});
        } catch (err) {
            error = err;
        }
        expect(error.failure.failedStep).toBe('second');
        expect(error.failure.compensated).toEqual([]);
        expect(error.failure.compensationErrors).toEqual([{ step: 'first', error: expect.any(Error) }]);
    });

    it('emits step hooks', async () => {
        const events: string[] = [];
        await runSaga([
            { name: 'a', execute: () => undefined }
        ], {}, { onStep: (event, step) => events.push(`${event}:${step.name}`) });
        expect(events).toEqual(['execute:a', 'complete:a']);
    });
});
