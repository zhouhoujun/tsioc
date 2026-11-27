import expect = require('expect');
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { Before, Suite, Test } from '@tsdi/unit';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { MenuBarComponent, MenuBarGroup } from '../menu-bar';
import { IconModule } from '../icon';

const groups: MenuBarGroup[] = [
    {
        items: [
            { id: 'run', label: 'Run' },
            { id: 'stop', label: 'Stop', disabled: true }
        ]
    },
    {
        items: [
            { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z' }
        ]
    },
    {
        items: [
            {
                id: 'theme', label: 'Theme', children: [
                    { id: 'theme:light', label: 'Light', checked: true },
                    { id: 'theme:dark', label: 'Dark' }
                ]
            }
        ]
    }
];

const nestedGroups: MenuBarGroup[] = [
    {
        items: [
            {
                id: 'view', label: 'View', children: [
                    {
                        id: 'zoom', label: 'Zoom', children: [
                            { id: 'zoom:in', label: 'Zoom In' },
                            {
                                id: 'zoom:out', label: 'Zoom Out', children: [
                                    { id: 'zoom:reset', label: 'Reset zoom' }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
];

@Suite('common menu bar DOM interactions')
export class MenuBarDomTest {
    ctx!: ApplicationContext;
    doc!: any;

    @Before()
    async init() {
        this.ctx = await Application.run(MenuBarComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, IconModule],
            providers: [
                { provide: MenuBarComponent, useClass: MenuBarComponent },
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                    }
                }
            ]
        });
        this.doc = this.ctx.get(DOCUMENT);
    }

    protected async render(selected: string[], source: MenuBarGroup[] = groups): Promise<any> {
        this.doc.body.replaceChildren();
        const ref = this.ctx.runners.getRef(MenuBarComponent) as ComponentRef<MenuBarComponent>;
        ref.instance.groups = source;
        ref.instance.selectAction = id => selected.push(id);
        await ref.render();
        for (let index = 0; index < 4; index++) {
            await Promise.resolve();
        }
        return ref.hostView.rootNodes[0] as any;
    }

    @Test('opens the popup and dispatches the clicked item')
    async selectsAnItem() {
        const selected: string[] = [];
        const root = await this.render(selected);
        const popup = root.querySelector('.menu-bar-popup');
        expect(popup.hasAttribute('hidden')).toBe(true);

        root.querySelector('.menu-bar-trigger').click();
        await Promise.resolve();
        expect(popup.hasAttribute('hidden')).toBe(false);

        root.querySelector('[data-menu-id="undo"]').click();
        await Promise.resolve();
        expect(selected).toEqual(['undo']);
        expect(popup.hasAttribute('hidden')).toBe(true);
    }

    @Test('renders a submenu and dispatches nested selections')
    async selectsSubmenuItem() {
        const selected: string[] = [];
        const root = await this.render(selected);
        root.querySelector('.menu-bar-trigger').click();
        await Promise.resolve();

        expect(root.querySelector('.menu-bar-submenu')).toBeNull();

        root.querySelector('[data-menu-id="theme"]').click();
        await Promise.resolve();
        expect(selected).toEqual([]);
        const submenu = root.querySelector('.menu-bar-submenu') as HTMLElement;
        expect(submenu.getAttribute('data-submenu-id')).toEqual('theme');
        expect(root.querySelector('[data-menu-id="theme:dark"]')).toBeTruthy();

        // Clicking the parent again collapses the flyout.
        root.querySelector('[data-menu-id="theme"]').click();
        await Promise.resolve();
        expect(root.querySelector('.menu-bar-submenu')).toBeNull();

        root.querySelector('[data-menu-id="theme"]').click();
        await Promise.resolve();
        root.querySelector('[data-menu-id="theme:dark"]').click();
        await Promise.resolve();
        expect(selected).toEqual(['theme:dark']);
        expect(root.querySelector('.menu-bar-submenu')).toBeNull();
    }

    @Test('opens a third-level submenu while keeping its ancestors open')
    async selectsNestedSubmenuItem() {
        const selected: string[] = [];
        const root = await this.render(selected, nestedGroups);
        root.querySelector('.menu-bar-trigger').click();
        await Promise.resolve();

        root.querySelector('[data-menu-id="view"]').click();
        await Promise.resolve();
        const outer = root.querySelector('.menu-bar-submenu[data-submenu-id="view"]') as HTMLElement;
        expect(outer.className).toContain('is-open');

        root.querySelector('[data-menu-id="zoom"]').click();
        await Promise.resolve();
        const inner = root.querySelector('.menu-bar-submenu[data-submenu-id="zoom"]') as HTMLElement;
        expect(outer.className).toContain('is-open');
        expect(inner.className).toContain('is-open');
        expect(root.querySelector('[data-menu-id="zoom:in"]')).toBeTruthy();

        root.querySelector('[data-menu-id="zoom:in"]').click();
        await Promise.resolve();
        expect(selected).toEqual(['zoom:in']);
        expect(root.querySelector('.menu-bar-submenu')).toBeNull();
    }

    @Test('supports four submenu levels without a recursive template')
    async selectsFourthLevelItem() {
        const selected: string[] = [];
        const root = await this.render(selected, nestedGroups);
        root.querySelector('.menu-bar-trigger').click();
        await Promise.resolve();
        for (const id of ['view', 'zoom', 'zoom:out']) {
            root.querySelector(`[data-menu-id="${id}"]`).click();
            await Promise.resolve();
        }
        const openLevels = Array.from(root.querySelectorAll('.menu-bar-submenu.is-open')) as HTMLElement[];
        expect(openLevels.map(level => level.getAttribute('data-submenu-id')))
            .toEqual(['view', 'zoom', 'zoom:out']);
        const reset = root.querySelector('[data-menu-id="zoom:reset"]') as HTMLElement;
        expect(reset).toBeTruthy();
        reset.click();
        await Promise.resolve();
        expect(selected).toEqual(['zoom:reset']);
        expect((root.querySelector('.menu-bar-popup') as HTMLElement).hasAttribute('hidden')).toBe(true);
    }

    @Test('walks nested submenu levels with ArrowRight and ArrowLeft')
    async nestedKeyboardNavigation() {
        const selected: string[] = [];
        const root = await this.render(selected, nestedGroups);
        this.doc.body.appendChild(root);
        const menu = (this.ctx.runners.getRef(MenuBarComponent) as ComponentRef<MenuBarComponent>).instance;
        menu.open = true;
        await Promise.resolve();

        const view = root.querySelector('[data-menu-id="view"]') as HTMLElement;
        view.focus();
        const key = (name: string) => view.dispatchEvent(new (this.doc.defaultView as any).KeyboardEvent('keydown', { key: name, bubbles: true }));
        key('ArrowRight');
        for (let i = 0; i < 6; i++) await Promise.resolve();
        const activeId = () => (this.doc.activeElement as HTMLElement | null)?.getAttribute?.('data-menu-id');
        const zoom = root.querySelector('[data-menu-id="zoom"]') as HTMLElement;
        expect(activeId()).toEqual('zoom');

        zoom.dispatchEvent(new (this.doc.defaultView as any).KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        for (let i = 0; i < 6; i++) await Promise.resolve();
        const zoomIn = root.querySelector('[data-menu-id="zoom:in"]') as HTMLElement;
        expect(activeId()).toEqual('zoom:in');
        expect(root.querySelector('.menu-bar-submenu[data-submenu-id="view"]')).toBeTruthy();
        expect(root.querySelector('.menu-bar-submenu[data-submenu-id="zoom"]')).toBeTruthy();

        key('ArrowLeft');
        for (let i = 0; i < 6; i++) await Promise.resolve();
        expect(activeId()).toEqual('zoom');
        expect(root.querySelector('.menu-bar-submenu[data-submenu-id="view"]')).toBeTruthy();
        expect(root.querySelector('.menu-bar-submenu[data-submenu-id="zoom"]')).toBeNull();

        key('ArrowLeft');
        for (let i = 0; i < 6; i++) await Promise.resolve();
        expect(activeId()).toEqual('view');
        expect(root.querySelector('.menu-bar-submenu')).toBeNull();
        root.remove();
    }

    @Test('disabled entries stay inert')
    async ignoresDisabledItems() {
        const selected: string[] = [];
        const root = await this.render(selected);
        root.querySelector('.menu-bar-trigger').click();
        await Promise.resolve();
        const stop = root.querySelector('[data-menu-id="stop"]');
        expect(stop.disabled).toBe(true);
        stop.click();
        await Promise.resolve();
        expect(selected).toEqual([]);
    }

    @Test('typing letters jumps to the next matching enabled item')
    async typeahead() {
        const selected: string[] = [];
        const root = await this.render(selected);
        this.doc.body.appendChild(root);
        const menu = (this.ctx.runners.getRef(MenuBarComponent) as ComponentRef<MenuBarComponent>).instance;
        menu.open = true;
        await Promise.resolve();
        const run = root.querySelector('[data-menu-id="run"]') as HTMLElement;
        run.focus();
        const key = (name: string) => run.dispatchEvent(new (this.doc.defaultView as any).KeyboardEvent('keydown', { key: name, bubbles: true }));
        const realNow = Date.now;
        let now = 1000;
        Date.now = () => now;
        try {
            key('s');
            await Promise.resolve();
            expect(this.doc.activeElement?.getAttribute('data-menu-id')).toEqual('run');
            now += 800;
            key('u');
            await Promise.resolve();
            expect(this.doc.activeElement?.getAttribute('data-menu-id')).toEqual('undo');
            now += 800;
            key('t');
            await Promise.resolve();
            expect(this.doc.activeElement?.getAttribute('data-menu-id')).toEqual('theme');
        } finally {
            Date.now = realNow;
            root.remove();
        }
    }

    @Test('rebuilds entries when a nested item field changes')
    async updatesNestedItems() {
        const selected: string[] = [];
        const root = await this.render(selected);
        const menu = (this.ctx.runners.getRef(MenuBarComponent) as ComponentRef<MenuBarComponent>).instance;

        expect(menu.entries[0].checked).toEqual(false);
        menu.groups[0].items[0].checked = true;
        await Promise.resolve();
        await Promise.resolve();

        expect(menu.entries[0].checked).toEqual(true);
        expect(root.querySelector('[data-menu-id="run"] .menu-bar-item-check')).toBeTruthy();
    }

    @Test('bounds the popup by the viewport instead of a fixed 480px cap')
    async boundsPopupToViewport() {
        const selected: string[] = [];
        const root = await this.render(selected);
        const menu = (this.ctx.runners.getRef(MenuBarComponent) as ComponentRef<MenuBarComponent>).instance;
        menu.close();
        await Promise.resolve();

        const win = this.doc.defaultView as any;
        Object.defineProperty(win, 'innerHeight', { value: 900, configurable: true });
        Object.defineProperty(win, 'innerWidth', { value: 1200, configurable: true });
        const trigger = root.querySelector('.menu-bar-trigger') as any;
        trigger.getBoundingClientRect = () => ({ top: 100, bottom: 130, left: 900, right: 1000, width: 100, height: 30 });

        trigger.click();
        await Promise.resolve();
        const popup = root.querySelector('.menu-bar-popup') as any;
        // 900 - 130 (trigger bottom) - 12 (margin) = 758, far above the old
        // min(60vh, 480px) cap that forced a scrollbar on tall windows.
        expect(popup.getAttribute('style')).toContain('max-height: 758px');
        expect(popup.getAttribute('style')).toContain('top: calc(100% + 6px)');
    }

    @Test('opens the popup upwards when the trigger sits near the bottom edge')
    async flipsPopupAboveTrigger() {
        const selected: string[] = [];
        const root = await this.render(selected);
        const menu = (this.ctx.runners.getRef(MenuBarComponent) as ComponentRef<MenuBarComponent>).instance;
        menu.close();
        await Promise.resolve();

        const win = this.doc.defaultView as any;
        Object.defineProperty(win, 'innerHeight', { value: 900, configurable: true });
        const trigger = root.querySelector('.menu-bar-trigger') as any;
        trigger.getBoundingClientRect = () => ({ top: 800, bottom: 830, left: 900, right: 1000, width: 100, height: 30 });

        trigger.click();
        await Promise.resolve();
        const popup = root.querySelector('.menu-bar-popup') as any;
        expect(popup.getAttribute('style')).toContain('bottom: calc(100% + 6px)');
        expect(popup.getAttribute('style')).toContain('top: auto');
        expect(popup.getAttribute('style')).toContain('max-height: 788px');
    }

    @Test('anchors the flyout on hover so a scrolling popup cannot clip it')
    async anchorsSubmenuOnHover() {
        const selected: string[] = [];
        const root = await this.render(selected);
        const menu = (this.ctx.runners.getRef(MenuBarComponent) as ComponentRef<MenuBarComponent>).instance;
        menu.close();
        await Promise.resolve();

        const win = this.doc.defaultView as any;
        Object.defineProperty(win, 'innerHeight', { value: 900, configurable: true });
        Object.defineProperty(win, 'innerWidth', { value: 1200, configurable: true });

        root.querySelector('.menu-bar-trigger').click();
        await Promise.resolve();

        const theme = root.querySelector('[data-menu-id="theme"]') as any;
        theme.getBoundingClientRect = () => ({ top: 300, bottom: 330, left: 100, right: 320, width: 220, height: 30 });
        theme.dispatchEvent(new (win as any).MouseEvent('mouseenter', { bubbles: false }));
        await Promise.resolve();

        const submenu = root.querySelector('.menu-bar-submenu') as any;
        expect(submenu.className).toContain('is-open');
        const style = submenu.getAttribute('style') || '';
        expect(style).toContain('position: fixed');
        expect(style).toContain('left: 322px');
        expect(style).toContain('top: 294px');
        // 900 - 294 (top) - 8 = 598: scrolls only if the flyout exceeds it.
        expect(style).toContain('max-height: 598px');

        theme.parentElement.dispatchEvent(new (win as any).MouseEvent('mouseleave', { bubbles: false }));
        await Promise.resolve();
        expect(submenu.className).not.toContain('is-open');

        // Keyboard focus opens the same anchored flyout and keeps it open while
        // focus stays inside the entry (for example tabbing into the children).
        theme.dispatchEvent(new (win as any).FocusEvent('focus', { bubbles: false }));
        await Promise.resolve();
        expect(submenu.className).toContain('is-open');
        expect(submenu.getAttribute('style')).toContain('position: fixed');

        theme.parentElement.dispatchEvent(new (win as any).FocusEvent('focusout', {
            bubbles: true,
            relatedTarget: this.doc.body
        }));
        await Promise.resolve();
        expect(submenu.className).not.toContain('is-open');
    }

    @Test('keeps the flyout aligned with its row near the bottom edge')
    async alignsFlyoutNearBottom() {
        const selected: string[] = [];
        const root = await this.render(selected);
        const menu = (this.ctx.runners.getRef(MenuBarComponent) as ComponentRef<MenuBarComponent>).instance;
        menu.close();
        await Promise.resolve();

        const win = this.doc.defaultView as any;
        Object.defineProperty(win, 'innerHeight', { value: 700, configurable: true });
        Object.defineProperty(win, 'innerWidth', { value: 1200, configurable: true });

        root.querySelector('.menu-bar-trigger').click();
        await Promise.resolve();

        const theme = root.querySelector('[data-menu-id="theme"]') as any;
        theme.getBoundingClientRect = () => ({ top: 600, bottom: 630, left: 100, right: 320, width: 220, height: 30 });
        theme.dispatchEvent(new (win as any).MouseEvent('mouseenter', { bubbles: false }));
        await Promise.resolve();

        const submenu = root.querySelector('.menu-bar-submenu') as any;
        const style = submenu.getAttribute('style') || '';
        // The flyout flips above the row and keeps its bottom on the row's
        // bottom; it must not be clamped somewhere in the middle of the menu.
        expect(style).toContain('bottom: 64px');
        expect(style).toContain('top: auto');
        expect(style).toContain('max-height: 622px');
    }

    @Test('anchors a left-opening flyout by its right edge')
    async alignsFlyoutOnTheLeftSide() {
        const selected: string[] = [];
        const root = await this.render(selected);
        const menu = (this.ctx.runners.getRef(MenuBarComponent) as ComponentRef<MenuBarComponent>).instance;
        menu.close();
        await Promise.resolve();

        const win = this.doc.defaultView as any;
        Object.defineProperty(win, 'innerHeight', { value: 900, configurable: true });
        Object.defineProperty(win, 'innerWidth', { value: 1200, configurable: true });

        root.querySelector('.menu-bar-trigger').click();
        await Promise.resolve();

        const theme = root.querySelector('[data-menu-id="theme"]') as any;
        theme.getBoundingClientRect = () => ({ top: 300, bottom: 330, left: 1000, right: 1200, width: 200, height: 30 });
        theme.dispatchEvent(new (win as any).MouseEvent('mouseenter', { bubbles: false }));
        await Promise.resolve();

        const submenu = root.querySelector('.menu-bar-submenu') as any;
        const style = submenu.getAttribute('style') || '';
        // 1200 - 1000 (item left) + 2 = 202: the flyout's right edge sits two
        // pixels left of the item, regardless of the flyout's own width.
        expect(style).toContain('right: 202px');
        expect(style).toContain('left: auto');
        expect(style).toContain('top: 294px');
    }

    @Test('Escape and outside clicks close the popup')
    async closesOnEscapeAndOutsideClick() {        const selected: string[] = [];
        const root = await this.render(selected);
        const popup = root.querySelector('.menu-bar-popup');

        root.querySelector('.menu-bar-trigger').click();
        await Promise.resolve();
        this.doc.dispatchEvent(new (this.doc.defaultView as any).KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true
        }));
        await Promise.resolve();
        expect(popup.hasAttribute('hidden')).toBe(true);

        root.querySelector('.menu-bar-trigger').click();
        await Promise.resolve();
        expect(popup.hasAttribute('hidden')).toBe(false);
        this.doc.body.dispatchEvent(new (this.doc.defaultView as any).MouseEvent('mousedown', { bubbles: true }));
        await Promise.resolve();
        expect(popup.hasAttribute('hidden')).toBe(true);
    }

    @Test('keyboard opens the menu, roves focus and walks submenus')
    async keyboardNavigation() {
        const selected: string[] = [];
        const root = await this.render(selected);
        const win = this.doc.defaultView;
        this.doc.body.appendChild(root);
        const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
        try {
            const trigger = root.querySelector('.menu-bar-trigger') as HTMLElement;
            const popup = root.querySelector('.menu-bar-popup') as HTMLElement;
            const activeId = () => (this.doc.activeElement as HTMLElement | null)?.getAttribute('data-menu-id');

            trigger.focus();
            trigger.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            await settle();
            expect(popup.hasAttribute('hidden')).toBe(false);
            expect(activeId()).toEqual('run');

            // Disabled entries are skipped while Arrow keys wrap around.
            const key = async (name: string) => {
                popup.dispatchEvent(new win.KeyboardEvent('keydown', { key: name, bubbles: true }));
                await settle();
            };
            await key('ArrowDown');
            expect(activeId()).toEqual('undo');
            await key('ArrowDown');
            expect(activeId()).toEqual('theme');
            await key('ArrowDown');
            expect(activeId()).toEqual('run');
            await key('End');
            expect(activeId()).toEqual('theme');
            await key('Home');
            expect(activeId()).toEqual('run');

            // Focusing a parent previews its flyout; ArrowRight enters it.
            await key('End');
            const theme = root.querySelector('[data-menu-id="theme"]') as HTMLElement;
            expect(theme.getAttribute('aria-haspopup')).toEqual('menu');
            expect(theme.getAttribute('aria-expanded')).toEqual('true');
            await key('ArrowRight');
            expect(theme.getAttribute('aria-expanded')).toEqual('true');
            expect(activeId()).toEqual('theme:light');
            await key('ArrowLeft');
            expect(activeId()).toEqual('theme');
            expect(theme.getAttribute('aria-expanded')).toEqual('false');

            // Escape closes and hands focus back to the trigger.
            this.doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await settle();
            expect(popup.hasAttribute('hidden')).toBe(true);
            expect(this.doc.activeElement).toBe(trigger);
        } finally {
            root.remove();
        }
    }
}
