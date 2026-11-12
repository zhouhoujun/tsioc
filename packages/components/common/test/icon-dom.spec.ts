import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ICON_STYLE_ID, IconModule } from '../icon';

@Component({
    selector: 'icon-host',
    template: `
    <div class="icons">
        <icon name="run" size="sm" label="Run workflow"></icon>
        <icon name="rename"></icon>
        <icon name="legacy-node" glyph="✎" size="lg"></icon>
        <icon name="unknown-node" glyph="@" size="xs"></icon>
        <icon name="task" size="md" label="Task node"></icon>
    </div>`
})
class IconHostComponent { }

@Suite('common icon directive DOM')
export class IconDomTest {
    ctx!: ApplicationContext;
    doc!: any;

    @Before()
    async init() {
        this.ctx = await Application.run(IconHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, IconModule],
            providers: [
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        return new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>').window.document;
                    }
                }
            ]
        });
        this.doc = this.ctx.get(DOCUMENT);
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }

    protected async render(): Promise<any[]> {
        const ref = this.ctx.get(ComponentFactory).create(IconHostComponent, {
            injector: this.ctx
        }) as ComponentRef<IconHostComponent>;
        await ref.render();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        return Array.from(root.querySelectorAll('icon')) as any[];
    }

    @Test('draws the shared vector and keeps the glyph as a text fallback')
    async rendersVectors() {
        const icons = await this.render();
        expect(icons.length).toBe(5);

        const run = icons[0];
        expect(run.getAttribute('data-icon')).toBe('run');
        expect(run.getAttribute('aria-label')).toBe('Run workflow');
        expect(run.getAttribute('role')).toBe('img');
        expect(run.getAttribute('class')).toContain('tsdi-icon-sm');
        const svg = run.querySelector('svg.tsdi-icon-svg') as any;
        expect(svg).toBeTruthy();
        expect(svg.getAttribute('viewBox')).toBe('0 0 16 16');
        expect(svg.getAttribute('aria-hidden')).toBe('true');
        const path = svg.querySelector('path') as any;
        expect(path.getAttribute('fill')).toBe('currentColor');
        expect(path.getAttribute('stroke')).toBe('none');
        expect(path.getAttribute('d')).toContain('12.2 8');
        expect(run.querySelector('.tsdi-icon-glyph')?.textContent).toBe('▶');

        const rename = icons[1];
        expect(rename.getAttribute('role')).toBe('presentation');
        expect(rename.getAttribute('aria-hidden')).toBe('true');
        expect(rename.querySelectorAll('path').length).toBe(2);
        expect(rename.querySelectorAll('path')[0].getAttribute('stroke-width')).toBe('1.6');
    }

    @Test('resolves legacy glyphs and keeps unknown glyphs as text')
    async resolvesLegacyGlyphs() {
        const icons = await this.render();
        const legacy = icons[2];
        expect(legacy.getAttribute('class')).toContain('tsdi-icon-lg');
        expect(legacy.querySelector('svg')).toBeTruthy();
        expect(legacy.querySelector('.tsdi-icon-glyph')?.textContent).toBe('✎');

        const unknown = icons[3];
        expect(unknown.querySelector('svg')).toBeFalsy();
        expect(unknown.getAttribute('class')).toContain('tsdi-icon-xs');
        expect(unknown.querySelector('.tsdi-icon-glyph')?.textContent).toBe('@');

        const element = icons[4];
        expect(element.getAttribute('data-icon')).toBe('task');
        expect(element.getAttribute('role')).toBe('img');
        expect(element.getAttribute('class')).toContain('tsdi-icon-md');
        expect(element.querySelector('svg path')).toBeTruthy();
    }

    @Test('installs the shared icon stylesheet once')
    async installsStyles() {
        await this.render();
        await this.render();
        const styles = this.doc.querySelectorAll(`#${ICON_STYLE_ID}`);
        expect(styles.length).toBe(1);
        expect(styles[0].textContent).toContain('.tsdi-icon-sm');
        expect(styles[0].textContent).toContain('svg + .tsdi-icon-glyph');
    }
}
