import { Attribute, Component } from '@tsdi/components';
import { normalizeTone, UiTone } from '../../src/ui';

/**
 * Empty/search-result placeholder with an optional primary action.
 *
 * ```html
 * <ui-empty icon="search" title="No sessions" hint="Try another query"
 *   actionLabel="Clear" :action="clearSearch"></ui-empty>
 * ```
 */
@Component({
    selector: 'ui-empty',
    template: `
    <div class="ui-empty {{emptyClass}}" data-tone="{{tone}}" role="status" aria-label="{{ariaLabel || title}}">
        <icon class="ui-empty-icon" v-if="icon" [name]="icon" [glyph]="iconGlyph || icon" size="lg"></icon>
        <p class="ui-empty-title" v-if="title">{{title}}</p>
        <p class="ui-empty-hint" v-if="hint">{{hint}}</p>
        <div class="ui-empty-actions" v-if="actionLabel">
            <ui-button :label="actionLabel" :action="runAction" size="sm"></ui-button>
        </div>
        <v-content></v-content>
    </div>`
})
export class EmptyStateComponent {
    @Attribute() title = '';
    @Attribute() ariaLabel = '';
    @Attribute() hint = '';
    @Attribute() icon = '';
    @Attribute() iconGlyph = '';
    @Attribute() actionLabel = '';
    @Attribute() className = '';
    @Attribute() action?: () => void;

    private _tone: UiTone = 'muted';

    @Attribute()
    get tone(): UiTone { return this._tone; }
    set tone(value: string) { this._tone = normalizeTone(value, 'muted'); }

    get emptyClass(): string {
        return [`is-${this._tone}`, this.className].filter(Boolean).join(' ');
    }

    runAction = (): void => {
        this.action?.();
    };
}
