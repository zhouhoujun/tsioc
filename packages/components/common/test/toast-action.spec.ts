import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ToastService } from '../toast';
import { ToastStackComponent } from '../toast';

@Suite('common toast async actions')
export class ToastActionTest {
    @Test('marks async actions pending and surfaces failures')
    async pendingAndError() {
        const service = new ToastService();
        let resolve: (() => void) | undefined;
        const id = service.show('Save failed', {
            durationMs: 0,
            actionLabel: 'Retry',
            action: () => new Promise<void>(done => { resolve = done; })
        });
        const pending = service.invoke(id);
        expect(service.current.find(item => item.id === id)?.actionPending).toEqual(true);
        resolve?.();
        await pending;
        expect(service.current.find(item => item.id === id)?.actionPending).toEqual(false);
        expect(service.current.find(item => item.id === id)?.actionError).toEqual('');

        const errorId = service.show('Bad', {
            durationMs: 0,
            actionLabel: 'Run',
            action: async () => { throw new Error('nope'); }
        });
        await service.invoke(errorId);
        expect(service.current.find(item => item.id === errorId)?.actionError).toEqual('nope');
        expect(service.current.find(item => item.id === errorId)?.actionPending).toEqual(false);
        service.onDestroy();
    }

    @Test('toast stack renders pending and error affordances')
    async stackRows() {
        const stack = new ToastStackComponent();
        stack.items = [{
            id: 't', message: 'Bad', tone: 'error', createdAt: 1,
            actionLabel: 'Retry', actionPending: true, actionError: 'nope'
        }];
        expect(stack.rows[0].actionPending).toEqual(true);
        expect(stack.rows[0].actionError).toEqual('nope');
    }
}
