import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ToastProviderComponent } from '../toast';

@Suite('common toast provider')
export class ToastProviderTest {
    @Test('owns a service, mirrors entries and forwards actions')
    async provider() {
        const provider = new ToastProviderComponent();
        provider.onInit();
        const id = provider.show('Saved', { durationMs: 0, actionLabel: 'Undo' });
        expect(provider.entries.length).toEqual(1);
        expect(provider.entries[0].message).toEqual('Saved');
        provider.invoke(id);
        provider.dismiss(id);
        expect(provider.entries).toEqual([]);
        provider.maxVisible = 1;
        provider.show('Again', { durationMs: 0 });
        provider.show('Third', { durationMs: 0 });
        expect(provider.visibleEntries.length).toEqual(1);
        expect(provider.hiddenCount).toBeGreaterThanOrEqual(1);
        provider.clear();
        expect(provider.entries).toEqual([]);
        provider.onDestroy();
    }
}
