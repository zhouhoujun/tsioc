import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ListComponent, ListEntry, ListPager } from '../src';

interface Item extends ListEntry {
    id: string;
    label: string;
}

const item = (id: string): Item => ({ id, label: `Item ${id}` });

@Suite('paged list')
export class ListTest {
    @Test('pager appends pages, dedupes ids and stops at hasMore=false')
    async pagerPages() {
        const requests: Array<string | undefined> = [];
        const pager = new ListPager<Item>(async cursor => {
            requests.push(cursor);
            return cursor
                ? { items: [item('b'), item('c')], hasMore: false }
                : { items: [item('a'), item('b')], hasMore: true };
        });

        expect(await pager.loadMore()).toEqual(true);
        expect(pager.items.map(entry => entry.id)).toEqual(['a', 'b']);
        expect(pager.cursor).toEqual('b');
        expect(pager.hasMore).toEqual(true);

        expect(await pager.loadMore()).toEqual(true);
        expect(pager.items.map(entry => entry.id)).toEqual(['a', 'b', 'c']);
        expect(pager.hasMore).toEqual(false);
        expect(requests).toEqual([undefined, 'b']);
        expect(await pager.loadMore()).toEqual(false);
    }

    @Test('pager ignores concurrent loads and records loader errors')
    async pagerGuards() {
        let release: (value: any) => void = () => undefined;
        const pager = new ListPager<Item>(() => new Promise(resolve => { release = resolve; }));
        const first = pager.loadMore();
        expect(pager.loading).toEqual(true);
        expect(await pager.loadMore()).toEqual(false);
        release({ items: [item('a')], hasMore: true });
        expect(await first).toEqual(true);
        expect(pager.loading).toEqual(false);

        const failing = new ListPager<Item>(async () => { throw new Error('offline'); });
        expect(await failing.loadMore()).toEqual(false);
        expect(failing.error).toEqual('offline');
        expect(failing.loading).toEqual(false);
    }

    @Test('component drives the same paging contract and selects rows')
    async componentPaging() {
        const component = new ListComponent();
        const selected: string[] = [];
        component.selectAction = entry => selected.push(entry.id);
        component.loadPage = async cursor => cursor
            ? { items: [item('b'), item('c')], hasMore: false }
            : { items: [item('a'), item('b')], hasMore: true };

        expect(await component.loadMore()).toEqual(true);
        expect(component.items.map(entry => entry.id)).toEqual(['a', 'b']);
        expect(component.hasMore).toEqual(true);
        expect(await component.loadMore()).toEqual(true);
        expect(component.items.map(entry => entry.id)).toEqual(['a', 'b', 'c']);
        expect(component.hasMore).toEqual(false);

        component.selectItem(component.items[1]);
        component.selectItem({ ...component.items[2], disabled: true });
        expect(selected).toEqual(['b']);
    }
}
