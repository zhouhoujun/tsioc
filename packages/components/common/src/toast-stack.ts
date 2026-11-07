import { Attribute, Component } from '@tsdi/components';
import type { ToastEntry } from './toast';

/**
 * Renderer-neutral toast strip. The host owns the queue (see `ToastService`)
 * and only supplies the current entries plus a dismiss action; the same markup
 * is painted by the terminal and browser skins.
 *
 * Toasts are transient by contract: each entry carries a tone, a close
 * affordance and (through the service) an auto-dismiss timer.
 */
@Component({
    selector: 'toast-stack',
    template: `
    <div class="console-toast-stack" role="status" aria-live="polite" v-show="visible">
        <label class="console-toast" data-tone="{{item.tone}}" v-for="item in entries">
            <span class="toast-message">{{item.message}}</span><span class="toast-close" role="button" data-cell-width="3" @click="dismiss(item.id, $event)">{{closeAffordance}}</span>
        </label>
    </div>`
})
export class ToastStackComponent {
    @Attribute() items: readonly ToastEntry[] = [];
    @Attribute() closeLabel = '✕';
    @Attribute() closeAction?: (id: string) => void;

    /** The close glyph carries a leading no-break space: terminal spans do not
     * honour padding, so the gap has to be part of the text run. */
    get closeAffordance(): string {
        return `\u00a0${this.closeLabel}`;
    }

    get entries(): readonly ToastEntry[] {
        return Array.isArray(this.items) ? this.items : [];
    }

    get visible(): boolean {
        return this.entries.length > 0;
    }

    dismiss(id: string, event?: Event): void {
        // The close affordance is the only clickable part; keep host renderers
        // that bubble (DOM) from treating it as a body click.
        event?.stopPropagation?.();
        this.closeAction?.(id);
    }
}
