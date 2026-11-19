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
