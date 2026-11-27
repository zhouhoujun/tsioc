import { Attribute, Component, ContentChild, ElementRef } from '@tsdi/components';
import { normalizeBoolean, normalizeTone, UiTone } from '../../src/ui';

/**
 * Generic surface card with an optional heading and action slot.
 *
 * ```html
 * <ui-card title="Routes" subtitle="2 staged" meta="v1">
 *   <ui-button slot="actions" label="Apply"></ui-button>
 *   <list :items="routes"></list>
 * </ui-card>
 * ```
 *
 * `slot="actions"` content lands in the heading row; all other projected
 * content lands in the body.
 */
@Component({
    selector: 'ui-card',
    template: `
    <section class="console-panel ui-card {{cardClass}}"
        data-tone="{{tone}}">
        <header class="ui-card-header" v-show="hasHeader">
            <div class="ui-card-heading">
                <h3 class="ui-card-title" role="heading" aria-level="{{headingLevelNumber}}" v-if="title">{{title}}</h3>
                <p class="ui-card-subtitle" v-if="subtitle">{{subtitle}}</p>
            </div>
            <span class="ui-card-meta" v-if="meta">{{meta}}</span>
            <div class="ui-card-actions"><v-content slot="actions"></v-content></div>
        </header>
        <div class="ui-card-body"><v-content></v-content></div>
    </section>`
})
export class CardComponent {
    @Attribute() title = '';
    @Attribute() subtitle = '';
    @Attribute() meta = '';
    @Attribute() className = '';
    @Attribute() headingLevel: number | string = 3;

    @ContentChild('[slot="actions"]') actionsNode?: ElementRef;

    private _tone: UiTone = 'default';
    private _dense = false;
    private _divider = false;

    @Attribute()
    get tone(): UiTone { return this._tone; }
    set tone(value: string) { this._tone = normalizeTone(value); }

    @Attribute()
    get dense(): boolean { return this._dense; }
    set dense(value: boolean | string) { this._dense = normalizeBoolean(value); }

    /** Render a separator between the heading and the body. */
    @Attribute()
    get divider(): boolean { return this._divider; }
    set divider(value: boolean | string) { this._divider = normalizeBoolean(value); }

    get headingLevelNumber(): number {
        return Math.max(1, Math.min(6, Math.floor(Number(this.headingLevel) || 3)));
    }

    get hasHeader(): boolean {
        return !!(this.title || this.subtitle || this.meta || this.actionsNode);
    }

    get cardClass(): string {
        return [
            `is-${this._tone}`,
            this._dense ? 'is-dense' : '',
            this._divider ? 'has-divider' : '',
            this.className
        ].filter(Boolean).join(' ');
    }
}
