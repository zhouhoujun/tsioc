import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ToastEntry } from '../toast';
import { ToastStackComponent } from '../toast';

const entry = (id: string, message: string, tone: ToastEntry['tone'] = 'info'): ToastEntry => ({
    id,
    message,
    tone,
    createdAt: 1,
    priority: 'normal'
});

@Suite('common toast stack')
export class ToastStackComponentTest {
    @Test('paints the queued toasts and dismisses the clicked one')
    paintsAndDismisses() {
        const stack = new ToastStackComponent();
        const dismissed: string[] = [];
        stack.items = [entry('toast-1', 'Copied', 'success'), entry('toast-2', 'Saved')];
        stack.closeAction = id => dismissed.push(id);

        expect(stack.visible).toEqual(true);
        expect(stack.rows.map(item => item.text)).toEqual(['Copied', 'Saved']);
        expect(stack.closeLabel).toEqual('✕');

        stack.dismiss('toast-2');
        expect(dismissed).toEqual(['toast-2']);
    }

    @Test('paints and invokes inline toast actions')
    paintsActions() {
        const stack = new ToastStackComponent();
        const invoked: string[] = [];
        stack.items = [{ ...entry('toast-1', 'Deleted'), actionLabel: 'Undo' }];
        stack.actionAction = id => invoked.push(id);

        expect(stack.rows[0].actionLabel).toEqual('Undo');
        expect(stack.rows[0].actionText).toEqual(' Undo');
        stack.invoke('toast-1');
        expect(invoked).toEqual(['toast-1']);
        stack.actionKeydown('toast-1', { key: 'Enter', preventDefault() { } });
        expect(invoked).toEqual(['toast-1', 'toast-1']);
        stack.actionKeydown('toast-1', { key: 'Tab', preventDefault() { } });
        expect(invoked).toEqual(['toast-1', 'toast-1']);
    }

    @Test('opt-in hover pause forwards pause/resume to the host')
    hoverPause() {
        const stack = new ToastStackComponent();
        const paused: string[] = [];
        const resumed: string[] = [];
        stack.items = [entry('toast-1', 'Saved')];
        stack.pauseAction = id => paused.push(id);
        stack.resumeAction = id => resumed.push(id);

        stack.hoverStart('toast-1');
        stack.hoverEnd('toast-1');
        expect(paused).toEqual([]);
        expect(resumed).toEqual([]);

        stack.pauseOnHover = true;
        stack.hoverStart('toast-1');
        stack.hoverEnd('toast-1');
        expect(paused).toEqual(['toast-1']);
        expect(resumed).toEqual(['toast-1']);
    }

    @Test('hides itself and ignores malformed input when the queue is empty')
    hidesWhenEmpty() {
        const stack = new ToastStackComponent();
        expect(stack.visible).toEqual(false);
        expect(stack.rows).toEqual([]);
        stack.items = undefined as unknown as ToastEntry[];
        expect(stack.visible).toEqual(false);
        expect(stack.rows).toEqual([]);
    }
}
