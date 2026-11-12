import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ListComponent, ListEntry, ListPager } from '../list';

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

    @Test('component can load its first page on mount')
    async componentAutoLoadsFirstPage() {
        const component = new ListComponent();
        component.autoLoad = true;
        component.loadPage = async () => ({ items: [item('a'), item('b')], hasMore: true });
        component.onInit();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(component.items.map(entry => entry.id)).toEqual(['a', 'b']);
        expect(component.hasMore).toEqual(true);
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

    @Test('pager prepends older pages and tracks hasPrevious')
    async pagerPrependsOlderPages() {
        const requests: Array<string | undefined> = [];
        const pager = new ListPager<Item>();
        pager.reset([item('c'), item('d')], true, true);

        expect(await pager.loadPrevious(async cursor => {
            requests.push(cursor);
            return { items: [item('a'), item('b')], hasMore: false };
        })).toEqual(true);

        expect(pager.items.map(entry => entry.id)).toEqual(['a', 'b', 'c', 'd']);
        expect(pager.hasPrevious).toEqual(false);
        expect(requests).toEqual(['c']);
        expect(await pager.loadPrevious(async () => ({ items: [item('z')], hasMore: false }))).toEqual(false);
    }

    @Test('component paints one window and pages loaded rows at the boundaries')
    async componentDrawsWindowedRows() {
        const component = new ListComponent();
        component.items = ['a', 'b', 'c', 'd', 'e', 'f'].map(item);
        component.visibleItems = 2;
        component.windowOffset = 4;
        expect(component.renderedItems.map(entry => entry.id)).toEqual(['e', 'f']);
        expect(component.atWindowEnd).toEqual(true);

        component.windowOffset = 2;
        expect(component.renderedItems.map(entry => entry.id)).toEqual(['c', 'd']);
        expect(component.atWindowEnd).toEqual(false);

        // Reaching the end of the painted window reveals already-loaded rows
        // before asking the loader for a new page.
        let loads = 0;
        component.loadPage = async () => { loads += 1; return { items: [item('g')], hasMore: false }; };
        component.onReachEnd();
        expect(component.windowOffset).toEqual(4);
        expect(loads).toEqual(0);

        component.onReachEnd();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(loads).toEqual(1);
        expect(component.items.map(entry => entry.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);

        component.onReachStart();
        expect(component.windowOffset).toEqual(2);
        component.onReachStart();
        expect(component.windowOffset).toEqual(0);
    }

    @Test('component prepends the previous page and paints it')
    async componentLoadsPreviousPage() {
        const component = new ListComponent();
        component.items = [item('c'), item('d')];
        component.visibleItems = 2;
        component.hasPrevious = true;
        component.previousCursor = 'c';
        const requests: Array<string | undefined> = [];
        component.loadPreviousPage = async cursor => {
            requests.push(cursor);
            return { items: [item('a'), item('b')], hasMore: false };
        };

        expect(await component.loadPrevious()).toEqual(true);
        expect(requests).toEqual(['c']);
        expect(component.items.map(entry => entry.id)).toEqual(['a', 'b', 'c', 'd']);
        expect(component.hasPrevious).toEqual(false);
        expect(component.renderedItems.map(entry => entry.id)).toEqual(['a', 'b']);
    }
}
