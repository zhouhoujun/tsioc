import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ScrollbarComponent, ScrollbarModule } from '../scrollbar';
import { resolveScrollbarThumb } from '../src/scrollbar';

@Component({
    selector: 'scrollbar-host',
    imports: [ScrollbarComponent],
    template: `<ui-scrollbar :total="100" :visible="10" :offset="45" :length="10"></ui-scrollbar>`
})
class ScrollbarHostComponent { }

@Suite('common scrollbar')
export class ScrollbarTest {
    @Test('resolves thumb position and clamps the offset')
    thumbMath() {
        expect(resolveScrollbarThumb(0, 10, 10, 6)).toEqual({
            start: 0,
            size: 6,
            scrollable: false,
            maxOffset: 0
        });
        expect(resolveScrollbarThumb(45, 10, 100, 10)).toEqual({
            start: 5,
            size: 1,
            scrollable: true,
            maxOffset: 90
        });
        expect(resolveScrollbarThumb(999, 10, 100, 10).start).toEqual(9);
        expect(resolveScrollbarThumb(0, 10, 100, 3, 3).size).toEqual(3);
    }

    @Test('paints a vertical track with one thumb cell')
    async rendersTrack() {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        const ctx: ApplicationContext = await Application.run(ScrollbarHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, ScrollbarModule],
            providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
        });
        try {
            const ref = ctx.get(ComponentFactory).create(ScrollbarHostComponent, {
                injector: ctx
            }) as ComponentRef<ScrollbarHostComponent>;
            await ref.render();
            await Promise.resolve();
            const scrollbar = ref.hostView.query(ScrollbarComponent) as ComponentRef<ScrollbarComponent>;
            const root = scrollbar.hostView.rootNodes[0] as HTMLElement;

            expect(root.getAttribute('role')).toEqual('scrollbar');
            expect(root.getAttribute('aria-valuenow')).toEqual('45');
            expect(root.querySelectorAll('.ui-scrollbar-track-cell').length).toEqual(9);
            expect(root.querySelectorAll('.ui-scrollbar-thumb').length).toEqual(1);
        } finally {
            await ctx.close();
        }
    }
}
