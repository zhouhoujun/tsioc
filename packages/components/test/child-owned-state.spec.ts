import expect = require('expect');
import { Application, ApplicationContext } from '@tsdi/core';
import { Attribute, Component, ComponentRef, ComponentsModule } from '../src';
import { HtmlTemplateModule } from '../html/src';
import { DOCUMENT } from '@tsdi/common';

/** Presentational-ish child that owns the state driving its own template. */
@Component({
    selector: 'probe-owner',
    template: `
    <section class="owner-shell">
        <div class="owner" v-if="visible">
            <span class="owner-title">{{label}}</span>
            <ul class="owner-list" v-if="items.length">
                <li class="owner-item" v-for="item in items">{{item}}</li>
            </ul>
            <empty-hint v-else class="owner-empty" :text="emptyText"></empty-hint>
        </div>
    </section>`
})
class ProbeOwner {
    @Attribute() label = '';

    private open = false;
    items: string[] = [];

    @Attribute()
    get visible(): boolean { return this.open; }
    set visible(value: boolean | string) {
        this.open = value === '' || value === true || value === 'true';
    }

    get emptyText(): string { return this.items.length ? '' : 'nothing yet'; }

    async fill(values: string[]): Promise<void> {
        this.visible = true;
        this.items = values;
    }
}

@Component({ selector: 'empty-hint', template: `<span class="hint">{{text}}</span>` })
class EmptyHint {
    @Attribute() text = '';
}

@Component({
    selector: 'probe-owner-host',
    imports: [ProbeOwner, EmptyHint],
    template: `<probe-owner #owner :visible="shown" label="Owned"></probe-owner>`
})
class ProbeOwnerHost {
    shown = false;
}

describe('Reactive child-owned state', () => {
    let ctx: ApplicationContext;

    before(async () => {
        const { JSDOM } = require('jsdom');
        const doc = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>').window.document;
        ctx = await Application.run(ProbeOwnerHost, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{ provide: DOCUMENT, useValue: doc }]
        });
    });

    after(async () => {
        await ctx?.close();
    });

    it('re-renders the child template after the child writes its own state', async () => {
        const ref = ctx.runners.getRef(ProbeOwnerHost) as ComponentRef<ProbeOwnerHost>;
        const root = ref.hostView.rootNodes[0] as any;
        const owner = ref.hostView.query(ProbeOwner) as ComponentRef<ProbeOwner>;
        expect(root.querySelector('.owner')).toBeFalsy();

        await owner.instance.fill(['a', 'b']);
        for (let index = 0; index < 8; index++) {
            await Promise.resolve();
        }

        expect(root.querySelector('.owner')).toBeTruthy();
        expect(root.querySelectorAll('.owner-item').length).toBe(2);
        expect(root.querySelector('.owner-empty')).toBeFalsy();

        owner.instance.items = [];
        for (let index = 0; index < 8; index++) {
            await Promise.resolve();
        }
        expect(root.querySelectorAll('.owner-item').length).toBe(0);
        expect(root.querySelector('.owner-empty')?.textContent).toContain('nothing yet');
    });
});
