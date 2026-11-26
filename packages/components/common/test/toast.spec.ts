import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AnimationClock } from '@tsdi/components';
import { ToastService } from '../toast';

/** Deterministic clock: tests advance `now` and call `tick()`. */
class FakeClock extends AnimationClock {
    readonly listeners = new Set<() => void>();

    subscribe(listener: () => void): void {
        this.listeners.add(listener);
    }

    unsubscribe(listener: () => void): void {
        this.listeners.delete(listener);
    }

    tick(): void {
        for (const listener of [...this.listeners]) {
            listener();
        }
    }
}

@Suite('common toast service')
export class ToastServiceTest {
    @Test('queues messages, notifies subscribers and dismisses by id')
    queueAndDismiss() {
        const service = new ToastService();
        const snapshots: string[][] = [];
        const unsubscribe = service.subscribe(entries => snapshots.push(entries.map(entry => entry.message)));
        const first = service.show('Copied', { tone: 'success', durationMs: 0 });
        const second = service.show('Saved', { durationMs: 0 });
        expect(first).toBeTruthy();
        expect(second).toBeTruthy();
        expect(service.current.map(entry => entry.message)).toEqual(['Copied', 'Saved']);
        expect(snapshots[snapshots.length - 1]).toEqual(['Copied', 'Saved']);
        service.dismiss(first);
        expect(service.current.map(entry => entry.message)).toEqual(['Saved']);
        unsubscribe();
        service.clear();
        expect(service.current).toEqual([]);
        service.onDestroy();
    }

    @Test('keeps an inline action and invokes it without dismissing')
    async actionInvocation() {
        const service = new ToastService();
        let undone = 0;
        const id = service.show('Deleted', {
            durationMs: 0,
            actionLabel: 'Undo',
            action: () => { undone += 1; }
        });
        expect(service.current[0].actionLabel).toEqual('Undo');
        service.invoke(id);
        expect(undone).toEqual(1);
        expect(service.current.length).toEqual(1);
        service.invoke('missing');
        expect(undone).toEqual(1);
        service.dismiss(id);
        service.invoke(id);
        expect(undone).toEqual(1);
        service.onDestroy();
    }

    @Test('sorts high priority entries ahead while preserving insertion order')
    async priorityOrder() {
        const service = new ToastService();
        service.show('first', { durationMs: 0 });
        service.show('urgent', { durationMs: 0, priority: 'high' });
        service.show('second', { durationMs: 0 });
        expect(service.current.map(entry => entry.message)).toEqual(['urgent', 'first', 'second']);
        service.dismiss(service.current[0].id);
        expect(service.current.map(entry => entry.message)).toEqual(['first', 'second']);
        service.onDestroy();
    }

    @Test('pause freezes the countdown and resume keeps the remaining time')
    async pauseAndResume() {
        const clock = new FakeClock();
        const service = new ToastService(clock);
        const realNow = Date.now;
        let now = 1000;
        Date.now = () => now;
        try {
            const id = service.show('Saved', { durationMs: 500 });
            now = 1300;
            service.pause(id);
            expect(clock.listeners.size).toEqual(0);

            now = 5000;
            clock.tick();
            expect(service.current.length).toEqual(1);

            service.resume(id);
            expect(clock.listeners.size).toEqual(1);
            now = 5100;
            clock.tick();
            expect(service.current.length).toEqual(1);
            now = 5200;
            clock.tick();
            expect(service.current).toEqual([]);
            expect(clock.listeners.size).toEqual(0);
        } finally {
            Date.now = realNow;
            service.onDestroy();
        }
    }

    @Test('caps the queue and evicts the oldest normal entry first')
    async capacity() {
        const service = new ToastService();
        service.setMaxEntries(2);
        service.show('first', { durationMs: 0 });
        service.show('urgent', { durationMs: 0, priority: 'high' });
        service.show('second', { durationMs: 0 });
        expect(service.current.map(entry => entry.message)).toEqual(['urgent', 'second']);

        service.setMaxEntries(1);
        service.show('third', { durationMs: 0 });
        expect(service.current.map(entry => entry.message)).toEqual(['third']);

        service.setMaxEntries(0);
        expect(service.current.map(entry => entry.message)).toEqual(['third']);
        service.onDestroy();
    }

    @Test('capacity eviction releases the evicted entry timer')
    async capacityReleasesClock() {
        const clock = new FakeClock();
        const service = new ToastService(clock);
        const realNow = Date.now;
        let now = 1000;
        Date.now = () => now;
        try {
            service.setMaxEntries(1);
            service.show('first', { durationMs: 500 });
            expect(clock.listeners.size).toEqual(1);
            service.show('second', { durationMs: 0 });
            expect(service.current.map(entry => entry.message)).toEqual(['second']);
            // The evicted first entry no longer owns a deadline/clock tick.
            expect(clock.listeners.size).toEqual(0);
            now = 2000;
            clock.tick();
            expect(service.current.map(entry => entry.message)).toEqual(['second']);
        } finally {
            Date.now = realNow;
            service.onDestroy();
        }
    }

    @Test('empty messages are ignored')
    ignoresEmptyMessages() {
        const service = new ToastService();
        expect(service.show('   ')).toEqual('');
        expect(service.current).toEqual([]);
        service.onDestroy();
    }

    @Test('auto-dismiss runs on the shared animation clock instead of a timer')
    autoDismissUsesClock() {
        const clock = new FakeClock();
        const service = new ToastService(clock);
        const realNow = Date.now;
        let now = 1000;
        Date.now = () => now;
        try {
            service.show('Saved', { durationMs: 500 });
            expect(clock.listeners.size).toEqual(1);

            now = 1400;
            clock.tick();
            expect(service.current.length).toEqual(1);

            now = 1600;
            clock.tick();
            expect(service.current).toEqual([]);
            // Last deadline removed: the shared clock is released.
            expect(clock.listeners.size).toEqual(0);
        } finally {
            Date.now = realNow;
            service.onDestroy();
        }
    }

    @Test('dismissing the last pending toast releases the clock and keeps others')
    dismissReleasesClock() {
        const clock = new FakeClock();
        const service = new ToastService(clock);
        const realNow = Date.now;
        Date.now = () => 2000;
        try {
            const first = service.show('Saved', { durationMs: 1000 });
            service.show('Copied', { durationMs: 1000 });
            expect(clock.listeners.size).toEqual(1);

            service.dismiss(first);
            expect(service.current.map(entry => entry.message)).toEqual(['Copied']);
            expect(clock.listeners.size).toEqual(1);

            service.dismiss(service.current[0].id);
            expect(service.current).toEqual([]);
            expect(clock.listeners.size).toEqual(0);
        } finally {
            Date.now = realNow;
            service.onDestroy();
        }
    }

    @Test('without a clock entries stay until dismissed')
    noClockKeepsEntry() {
        const service = new ToastService();
        const id = service.show('Saved', { durationMs: 10 });
        expect(service.current.length).toEqual(1);
        service.dismiss(id);
        expect(service.current).toEqual([]);
        service.onDestroy();
    }
}
