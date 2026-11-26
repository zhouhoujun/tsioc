import expect = require('expect');
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { Before, Suite, Test } from '@tsdi/unit';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { TabBarComponent, TabBarSource } from '../tab-bar';

const source: TabBarSource = {
    visible: true,
    items: [
        { id: 'a', label: ' Alpha ', active: true, showClose: true },
        { id: 'b', label: ' Beta ', active: false, showClose: false }
    ],
    showCreate: true,
    createLabel: ' + ',
    closeLabel: 'x',
    select() { },
    create() { },
    close() { }
};

@Suite('common tab bar DOM interactions')
export class TabBarDomTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(TabBarComponent, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [
                { provide: TabBarComponent, useClass: TabBarComponent },
                {
                    provide: 'TAB_BAR_DOM_TEST_SOURCE',
                    useValue: source
                },
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                    }
                }
            ]
        });
    }

    @Test('hover-mode close affords are rendered for DOM hover reveal')
    async hoverCloseMode() {
        const ref = this.ctx.runners.getRef(TabBarComponent) as ComponentRef<TabBarComponent>;
        const closed: string[] = [];
        ref.instance.source = {
            ...source,
            items: [
                { id: 'a', label: ' Alpha ', active: true, showClose: true },
                { id: 'b', label: ' Beta ', active: false, showClose: 'hover' }
            ],
            close: id => closed.push(id)
        };
        await ref.render();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        const closes = Array.from(root.querySelectorAll('.tab-close')) as any[];
        expect(closes.length).toEqual(2);
        expect(closes[0].getAttribute('data-close-mode')).toEqual('always');
        expect(closes[1].getAttribute('data-close-mode')).toEqual('hover');
        // A revealed hover affordance closes its own tab.
        closes[1].click();
        await Promise.resolve();
        expect(closed).toEqual(['b']);
    }

    @Test('the shared tab skin is installed once in the document head')
    async installsSharedSkin() {
        const ref = this.ctx.runners.getRef(TabBarComponent) as ComponentRef<TabBarComponent>;
        await ref.render();
        await Promise.resolve();
        const doc = this.ctx.get(DOCUMENT) as Document;
        const style = doc.getElementById('tsdi-tab-bar-styles');
        expect(!!style).toEqual(true);
        const css = style?.textContent || '';
        expect(css).toContain('.tab-close');
        expect(css).toContain('.tab-new:hover');
        // The + keeps the workflow hover animation (fade + scale).
        expect(css).toContain('transform: scale(1.08)');
        expect(css).toContain('transition: background-color');
    }

    @Test('clicking the close affordance closes without selecting the tab')
    async closeDoesNotSelect() {
        const ref = this.ctx.runners.getRef(TabBarComponent) as ComponentRef<TabBarComponent>;
        const selected: string[] = [];
        const closed: string[] = [];
        ref.instance.source = {
            ...source,
            select: id => selected.push(id),
            close: id => closed.push(id)
        };
        await ref.render();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        root.querySelector('.tab-close').click();
        await Promise.resolve();
        expect(closed).toEqual(['a']);
        expect(selected).toEqual([]);
    }

    @Test('DOM overflow pins paging arrows and scrolls the strip')
    async domOverflowArrows() {
        const ref = this.ctx.runners.getRef(TabBarComponent) as ComponentRef<TabBarComponent>;
        ref.instance.source = {
            ...source,
            overflowMode: 'scroll',
            items: [
                { id: 'a', label: ' Alpha ', active: true, showClose: true },
                { id: 'b', label: ' Beta ', active: false, showClose: true },
                { id: 'c', label: ' Gamma ', active: false, showClose: true },
                { id: 'd', label: ' Delta ', active: false, showClose: true }
            ]
        };
        await ref.render();
        await Promise.resolve();
        const root = (ref.instance as any).resolveStripElement() as any;
        // JSDOM has no layout engine; provide the metrics a real browser
        // reports for an overflowing strip.
        Object.defineProperty(root, 'clientWidth', { configurable: true, value: 100 });
        Object.defineProperty(root, 'scrollWidth', { configurable: true, value: 400 });
        root.scrollLeft = 0;
        const settle = async () => { for (let index = 0; index < 8; index += 1) { await Promise.resolve(); } };
        (ref.instance as any).syncDomOverflow();
        await settle();
        const back = root.querySelector('.tab-scroll-back') as any;
        const forward = root.querySelector('.tab-scroll-forward') as any;
        expect(!!back).toEqual(true);
        expect(!!forward).toEqual(true);
        expect(back.hasAttribute('hidden')).toEqual(false);
        expect(back.getAttribute('data-disabled')).toEqual('true');
        expect(forward.hasAttribute('hidden')).toEqual(false);
        expect(forward.getAttribute('data-disabled')).toEqual('false');
        forward.click();
        await settle();
        // Paging moves the native scroll offset; the left arrow then enables.
        expect(root.scrollLeft).toBeGreaterThan(0);
        (ref.instance as any).syncDomOverflow();
        await settle();
        expect(back.getAttribute('data-disabled')).toEqual('false');
        back.click();
        await settle();
        expect(root.scrollLeft).toEqual(0);
        (ref.instance as any).syncDomOverflow();
        await settle();
        expect(back.getAttribute('data-disabled')).toEqual('true');
    }

    @Test('close affordances are keyboard operable and hand focus back to a live tab')
    async closeKeydown() {
        const ref = this.ctx.runners.getRef(TabBarComponent) as ComponentRef<TabBarComponent>;
        const closed: string[] = [];
        const doc = this.ctx.get(DOCUMENT) as Document;
        doc.body.appendChild(ref.hostView.rootNodes[0] as any);
        ref.instance.source = {
            ...source,
            items: [
                { id: 'a', label: ' Alpha ', active: true, showClose: true },
                { id: 'b', label: ' Beta ', active: false, showClose: true }
            ],
            close: id => closed.push(id)
        };
        await ref.render();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        const closes = Array.from(root.querySelectorAll('.tab-close')) as HTMLElement[];
        expect(closes.every(close => close.getAttribute('tabindex') === '0')).toEqual(true);
        closes[0].dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await Promise.resolve();
        expect(closed).toEqual(['a']);
        root.remove();
    }

    @Test('DOM overflow uses one more menu listing every tab')
    async domOverflowMenu() {
        const ref = this.ctx.runners.getRef(TabBarComponent) as ComponentRef<TabBarComponent>;
        const selected: string[] = [];
        ref.instance.source = {
            ...source,
            items: [
                { id: 'a', label: ' Alpha ', active: true, showClose: true },
                { id: 'b', label: ' Beta ', active: false, showClose: true },
                { id: 'c', label: ' Gamma ', active: false, showClose: true },
                { id: 'd', label: ' Delta ', active: false, showClose: true }
            ],
            select: id => selected.push(id)
        };
        await ref.render();
        await Promise.resolve();
        const root = (ref.instance as any).resolveStripElement() as any;
        Object.defineProperty(root, 'clientWidth', { configurable: true, value: 100 });
        Object.defineProperty(root, 'scrollWidth', { configurable: true, value: 400 });
        const settle = async () => { for (let index = 0; index < 8; index += 1) { await Promise.resolve(); } };
        (ref.instance as any).syncDomOverflow();
        await settle();
        expect(root.querySelector('.tab-scroll-back')).toBeFalsy();
        expect(root.querySelector('.tab-scroll-forward')).toBeFalsy();
        const more = root.querySelector('.tab-overflow') as HTMLElement;
        expect(!!more).toEqual(true);
        expect(more.getAttribute('aria-haspopup')).toEqual('menu');
        const win = (this.ctx.get(DOCUMENT) as Document).defaultView as any;
        Object.defineProperty(win, 'innerWidth', { value: 320, configurable: true });
        Object.defineProperty(win, 'innerHeight', { value: 240, configurable: true });
        (more as any).getBoundingClientRect = () => ({ left: 280, right: 310, top: 10, bottom: 30, width: 30, height: 20 });
        more.click();
        await settle();
        const menu = root.querySelector('.tab-overflow-menu') as HTMLElement;
        expect(menu.style.position).toEqual('fixed');
        expect(menu.style.top).toEqual('34px');
        expect(menu.style.left).toEqual('70px');
        const items = Array.from(root.querySelectorAll('.tab-overflow-item')) as HTMLElement[];
        expect(items.map(item => item.textContent?.trim())).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
        items[2].click();
        await settle();
        expect(selected).toEqual(['c']);
        expect(root.querySelector('.tab-overflow-menu')).toBeFalsy();
        (ref.instance as any).focusedKey = '';
    }

    @Test('roving tabindex and arrow keys move selection across enabled tabs')
    async rovingTabindex() {
        const ref = this.ctx.runners.getRef(TabBarComponent) as ComponentRef<TabBarComponent>;
        const selected: string[] = [];
        ref.instance.source = {
            ...source,
            items: [
                { id: 'a', label: ' Alpha ', active: true, showClose: true },
                { id: 'b', label: ' Beta ', active: false, disabled: true },
                { id: 'c', label: ' Gamma ', active: false, showClose: true }
            ],
            select: id => selected.push(id)
        };
        await ref.render();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        const doc = this.ctx.get(DOCUMENT) as Document;
        const tabs = Array.from(root.querySelectorAll('.tab')) as any[];

        expect(root.getAttribute('role')).toEqual('tablist');
        expect(root.getAttribute('aria-orientation')).toEqual('horizontal');
        expect(tabs.map(tab => tab.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);

        // ArrowRight wraps past the disabled tab.
        tabs[0].dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(selected).toEqual(['c']);
        // Home returns to the first enabled tab, End jumps to the last.
        tabs[0].dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'End', bubbles: true }));
        expect(selected).toEqual(['c', 'c']);
        tabs[0].dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
        expect(selected).toEqual(['c', 'c', 'a']);
        // Enter activates the focused tab.
        tabs[0].dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(selected).toEqual(['c', 'c', 'a', 'a']);
    }
}
