import { Attribute, Component, Computed } from '@tsdi/components';
import { normalizeBoolean } from '../../src/ui';
import { getDisplayWidth } from '../../src/display-width';
import type { ToastEntry, ToastTone } from './toast';

/** One painted toast row: stable identity, semantic tone and display text. */
export interface ToastRow {
    id: string;
    tone: ToastTone;
    text: string;
    actionLabel: string;
    /** Action text including its leading gap (terminal spans do not pad). */
    actionText: string;
}

/**
 * Renderer-neutral toast strip. The host owns the queue (see `ToastService`)
 * and only supplies the current entries plus a dismiss action; the same markup
 * is painted by the terminal and browser skins.
 *
 * Toasts are transient by contract: each entry carries a tone, a close
 * affordance and (through the service) an auto-dismiss timer.
 */
@Component({
    selector: 'toast-stack, ui-toast-stack',
    template: `
    <div class="console-toast-stack" role="status" aria-live="polite" v-show="visible">
        <div class="console-toast-card">
        <label class="console-toast" data-tone="{{item.tone}}" v-for="item in rows" trackBy="id"
            @mouseenter="hoverStart(item.id)" @mouseleave="hoverEnd(item.id)">
            <span class="toast-message">{{item.text}}</span><span class="toast-action" role="button" tabindex="0"
                focusable="true" v-if="item.actionLabel" @click="invoke(item.id, $event)"
                @keydown="actionKeydown(item.id, $event)">{{item.actionText}}</span><span class="toast-close" role="button" data-cell-width="3" @click="dismiss(item.id, $event)">{{closeAffordance}}</span>
        </label>
        </div>
    </div>`
})
export class ToastStackComponent {
    @Attribute() items: readonly ToastEntry[] = [];
    @Attribute() closeLabel = '✕';
    @Attribute() closeAction?: (id: string) => void;
    /** Host runs the entry action (for example `ToastService.invoke`). */
    @Attribute() actionAction?: (id: string) => void;
    @Attribute() pauseAction?: (id: string) => void;
    @Attribute() resumeAction?: (id: string) => void;
    /** Inner content width for terminal cards; pads the message so ✕ sits right. */
    @Attribute() messageWidth = 0;
    private _pauseOnHover = false;

    /** Opt-in: hovering a toast pauses its countdown through the host actions. */
    @Attribute()
    get pauseOnHover(): boolean { return this._pauseOnHover; }
    set pauseOnHover(value: boolean | string) { this._pauseOnHover = normalizeBoolean(value); }

    /** The close glyph carries a leading no-break space: terminal spans do not
     * honour padding, so the gap has to be part of the text run. */
    get closeAffordance(): string {
        return `\u00a0${this.closeLabel}`;
    }

    /** Rows painted by the strip: the queue entry plus its padded display text. */
    @Computed()
    get rows(): ToastRow[] {
        const items = Array.isArray(this.items) ? this.items : [];
        const width = Math.max(0, Math.floor(Number(this.messageWidth) || 0));
        if (!width) {
            return items.map(item => ({
                id: String(item?.id ?? ''),
                tone: item?.tone || 'info',
                text: String(item?.message ?? ''),
                actionLabel: String(item?.actionLabel ?? ''),
                actionText: item?.actionLabel ? ` ${item.actionLabel}` : ''
            }));
        }
        const closeWidth = getDisplayWidth(this.closeAffordance);
        return items.map(item => {
            const message = String(item?.message ?? '');
            const actionLabel = String(item?.actionLabel ?? '');
            const actionText = actionLabel ? ` ${actionLabel}` : '';
            const pad = Math.max(1, width - closeWidth - getDisplayWidth(actionText) - getDisplayWidth(message));
            return {
                id: String(item?.id ?? ''),
                tone: item?.tone || 'info',
                text: `${message}${' '.repeat(pad)}`,
                actionLabel,
                actionText
            };
        });
    }

    /** @deprecated Use `rows`. */
    get entries(): ToastRow[] {
        return this.rows;
    }

    @Computed()
    get visible(): boolean {
        return this.rows.length > 0;
    }

    hoverStart(id: string): void {
        if (this._pauseOnHover) {
            this.pauseAction?.(id);
        }
    }

    hoverEnd(id: string): void {
        if (this._pauseOnHover) {
            this.resumeAction?.(id);
        }
    }

    invoke(id: string, event?: Event): void {
        event?.stopPropagation?.();
        this.actionAction?.(id);
    }

    actionKeydown(id: string, event: any): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            event.stopPropagation?.();
            this.actionAction?.(id);
        }
    }

    dismiss(id: string, event?: Event): void {
        // The close affordance is the only clickable part; keep host renderers
        // that bubble (DOM) from treating it as a body click.
        event?.stopPropagation?.();
        this.closeAction?.(id);
    }
}
