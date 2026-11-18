import { Attribute, Component } from '@tsdi/components';
import { normalizeBoolean, normalizeTone, UiTone } from '../../src/ui';

/**
 * Inline alert/callout (not a modal). The host decides when it is visible;
 * `tone` drives the semantic color and `role` switches to `alert` for errors.
 */
@Component({
    selector: 'ui-alert',
    template: `
    <div class="ui-alert {{alertClass}}" data-tone="{{tone}}" role="{{role}}">
        <icon class="ui-alert-icon" v-if="icon" [name]="icon" [glyph]="iconGlyph || icon" size="sm"></icon>
        <div class="ui-alert-body">
            <span class="ui-alert-title" v-if="title">{{title}}</span>
            <span class="ui-alert-line" v-for="line in lines">{{line}}</span>
            <v-content></v-content>
        </div>
        <button class="ui-alert-action" type="button" v-if="actionLabel" @click="runAction">{{actionLabel}}</button>
        <button class="ui-alert-close" type="button" v-if="dismissible"
            aria-label="{{closeLabel}}" @click="close">{{closeLabel}}</button>
    </div>`
})
export class AlertNoticeComponent {
    @Attribute() title = '';
    @Attribute() lines: string[] = [];
    @Attribute() icon = '';
    @Attribute() iconGlyph = '';
    @Attribute() actionLabel = '';
    @Attribute() closeLabel = 'Dismiss';
    @Attribute() className = '';
    @Attribute() action?: () => void;
    @Attribute() closeAction?: () => void;
    private _tone: UiTone = 'info';
    private _dismissible = false;

    @Attribute()
    get tone(): UiTone { return this._tone; }
    set tone(value: string) { this._tone = normalizeTone(value, 'info'); }

    @Attribute()
    get dismissible(): boolean { return this._dismissible; }
    set dismissible(value: boolean | string) { this._dismissible = normalizeBoolean(value); }

    get role(): 'alert' | 'status' {
        return this._tone === 'danger' || this._tone === 'error' ? 'alert' : 'status';
    }

    get alertClass(): string {
        return [`is-${this._tone}`, this.className].filter(Boolean).join(' ');
    }

    runAction(): void {
        this.action?.();
    }

    close(): void {
        this.closeAction?.();
    }
}
