import expect = require('expect');
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { Before, Suite, Test } from '@tsdi/unit';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { MenuBarComponent, MenuBarGroup } from '../src';

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

@Suite('common menu bar DOM interactions')
export class MenuBarDomTest {
    ctx!: ApplicationContext;
    doc!: any;

    @Before()
    async init() {
        this.ctx = await Application.run(MenuBarComponent, {
            deps: [HtmlTemplateModule, ComponentsModule],
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

    protected async render(selected: string[]): Promise<any> {
        const ref = this.ctx.runners.getRef(MenuBarComponent) as ComponentRef<MenuBarComponent>;
        ref.instance.groups = groups;
        ref.instance.selectAction = id => selected.push(id);
        await ref.render();
        await Promise.resolve();
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

        const submenu = root.querySelector('.menu-bar-submenu');
        expect(submenu).toBeTruthy();
        expect(root.querySelector('[data-menu-id="theme:dark"]')).toBeTruthy();

        root.querySelector('[data-menu-id="theme"]').click();
        await Promise.resolve();
        expect(selected).toEqual([]);

        root.querySelector('[data-menu-id="theme:dark"]').click();
        await Promise.resolve();
        expect(selected).toEqual(['theme:dark']);
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

    @Test('Escape and outside clicks close the popup')
    async closesOnEscapeAndOutsideClick() {
        const selected: string[] = [];
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
}
