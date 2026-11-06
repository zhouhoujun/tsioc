import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ToastService } from '../src';

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
}
