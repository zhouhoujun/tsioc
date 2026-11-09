import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule, ViewChild } from '@tsdi/components';
import { BaseComponentsModule, GridLayoutComponent, installGridLayoutStyles } from '@tsdi/components/common';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '../src';

@Component({
    selector: 'grid-layout-test',
    template: `
    <grid-layout #grid columns="2" gap="16">
        <grid-item span="2"><p class="wide">Wide</p></grid-item>
        <grid-item><p class="a">A</p></grid-item>
        <grid-item><p class="b">B</p></grid-item>
    </grid-layout>`
})
class GridLayoutTestComponent {
    @ViewChild('grid', GridLayoutComponent) grid?: GridLayoutComponent;
}

@Suite('Grid layout')
export class GridLayoutSpec {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
        installGridLayoutStyles(dom.window.document);
        this.ctx = await Application.run(GridLayoutTestComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, BaseComponentsModule],
            providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
        });
    }

    @Test('mounts projected items into a CSS grid and applies spans')
    async mountsGridItems() {
        const ref = this.ctx.runners.getRef(GridLayoutTestComponent) as ComponentRef<GridLayoutTestComponent>;
        const root = ref.hostView.rootNodes[0] as any;
        const grid = root.querySelector('.grid-layout') as HTMLElement;
        expect(grid.querySelector('.wide')?.textContent).toBe('Wide');
        expect(grid.querySelector('.a')?.textContent).toBe('A');
        expect(grid.querySelector('.b')?.textContent).toBe('B');
        expect(grid.querySelectorAll('.grid-item').length).toBe(3);
        expect(grid.querySelector('.grid-layout-items')?.children.length).toBe(3);
        expect(grid.getAttribute('style') || '').toContain('repeat(2, minmax(0, 1fr))');
        expect(grid.getAttribute('style') || '').toContain('16px');
        const wide = grid.querySelector('.grid-item') as HTMLElement;
        expect(wide.getAttribute('style') || '').toContain('grid-column: span 2');
    }

    @Test('supports auto-fit and template areas')
    async supportsAutoFitAndAreas() {
        const ref = this.ctx.runners.getRef(GridLayoutTestComponent) as ComponentRef<GridLayoutTestComponent>;
        const component = ref.instance.grid!;
        component.autoFit = true;
        component.minItemWidth = 180;
        component.areas = ['header header', 'sidebar main'];
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        const style = (root.querySelector('.grid-layout') as HTMLElement).getAttribute('style') || '';
        expect(style).toContain('repeat(auto-fit, minmax(180px, 1fr))');
        expect(style).toContain('"header header"');
        expect(style).toContain('"sidebar main"');
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
