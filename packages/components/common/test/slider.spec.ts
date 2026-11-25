import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { SliderComponent, SliderModule } from '../slider';

@Component({
    selector: 'slider-host',
    imports: [SliderComponent],
    template: `
    <ui-slider label="Volume" :value="volume" :min="0" :max="100" :step="10"
        unit="%" :width="10" :changeAction="onVolume"></ui-slider>
    <ui-slider label="Locked" :value="30" disabled :changeAction="onLocked"></ui-slider>`
})
class SliderHostComponent {
    volume = 50;
    locked = 0;
    onVolume = (value: number) => { this.volume = value; };
    onLocked = () => { this.locked += 1; };
}

@Suite('common slider')
export class SliderTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(SliderHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, SliderModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    protected async mount(): Promise<{ ref: ComponentRef<SliderHostComponent>; root: HTMLElement; locked: HTMLElement; host: SliderHostComponent; slider: ComponentRef<SliderComponent> }> {
        const ref = this.ctx.get(ComponentFactory).create(SliderHostComponent, {
            injector: this.ctx
        }) as ComponentRef<SliderHostComponent>;
        await ref.render();
        await Promise.resolve();
        const sliders = ref.hostView.queryAll(SliderComponent) as ComponentRef<SliderComponent>[];
        return {
            ref,
            root: sliders[0].hostView.rootNodes[0] as HTMLElement,
            locked: sliders[1].hostView.rootNodes[0] as HTMLElement,
            host: ref.instance as SliderHostComponent,
            slider: sliders[0]
        };
    }

    @Test('paints the same text track in DOM and TUI')
    async rendersTrack() {
        const { root, host } = await this.mount();
        const filled = root.querySelector('.ui-slider-filled') as HTMLElement;
        const rest = root.querySelector('.ui-slider-rest') as HTMLElement;

        expect(root.getAttribute('role')).toEqual('slider');
        expect(root.getAttribute('aria-valuemin')).toEqual('0');
        expect(root.getAttribute('aria-valuemax')).toEqual('100');
        expect(root.getAttribute('aria-valuenow')).toEqual('50');
        expect(root.getAttribute('aria-valuetext')).toEqual('50%');
        expect(root.getAttribute('tabindex')).toEqual('0');
        expect(filled.textContent).toEqual('━━━━━');
        expect(rest.textContent).toEqual('────');
        expect(root.textContent).toContain('Volume');
        expect(root.textContent).toContain('50%');
        expect(host.volume).toEqual(50);
        const style = (this.ctx.get(DOCUMENT) as Document).getElementById('tsdi-slider-styles');
        expect(style?.textContent).toContain('.ui-slider');
    }

    @Test('keyboard steps, pages and jumps to the ends')
    async keyboard() {
        const { root, host } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;
        const key = async (name: string) => {
            root.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: name, bubbles: true }));
            await Promise.resolve();
        };

        await key('ArrowRight');
        expect(host.volume).toEqual(60);
        expect(root.getAttribute('aria-valuenow')).toEqual('60');

        await key('ArrowLeft');
        expect(host.volume).toEqual(50);

        await key('PageUp');
        expect(host.volume).toEqual(100);
        await key('PageDown');
        expect(host.volume).toEqual(0);
        await key('End');
        expect(host.volume).toEqual(100);
        await key('Home');
        expect(host.volume).toEqual(0);
    }

    @Test('snaps programmatic values and ignores disabled sliders')
    async disabledAndSnap() {
        const { root, locked, host, slider } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;

        slider.instance.setValue(55);
        await Promise.resolve();
        expect(host.volume).toEqual(60);
        expect(root.getAttribute('aria-valuenow')).toEqual('60');

        expect(locked.getAttribute('aria-disabled')).toEqual('true');
        expect(locked.getAttribute('tabindex')).toEqual('-1');
        locked.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'End', bubbles: true }));
        expect(host.locked).toEqual(0);
        expect(locked.getAttribute('aria-valuenow')).toEqual('30');
    }
}
