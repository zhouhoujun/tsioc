import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { QueryList } from '../src/refs/query-list';

@Suite('QueryList')
export class QueryListTest {
    @Test('coalesces change notifications while keeping contents readable')
    async coalescesChanges() {
        const list = new QueryList<number>();
        let changes = 0;
        list.changes.subscribe(() => { changes += 1; });

        list.reset([1, 2]);
        expect(list.toArray()).toEqual([1, 2]);
        expect(changes).toBe(0);

        list.reset([1, 2, 3]);
        await Promise.resolve();
        expect(changes).toBe(1);
        expect(list.length).toBe(3);

        list.reset([1, 2, 3]);
        await Promise.resolve();
        expect(changes).toBe(2);
    }
}
