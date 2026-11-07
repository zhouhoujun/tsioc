import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ToastEntry } from '../src';
import { ToastStackComponent } from '../src/toast-stack';

const entry = (id: string, message: string, tone: ToastEntry['tone'] = 'info'): ToastEntry => ({
    id,
    message,
    tone,
    createdAt: 1
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
        expect(stack.entries.map(item => item.message)).toEqual(['Copied', 'Saved']);
        expect(stack.closeLabel).toEqual('✕');

        stack.dismiss('toast-2');
        expect(dismissed).toEqual(['toast-2']);
    }

    @Test('hides itself and ignores malformed input when the queue is empty')
    hidesWhenEmpty() {
        const stack = new ToastStackComponent();
        expect(stack.visible).toEqual(false);
        expect(stack.entries).toEqual([]);
        stack.items = undefined as unknown as ToastEntry[];
        expect(stack.visible).toEqual(false);
        expect(stack.entries).toEqual([]);
    }
}
