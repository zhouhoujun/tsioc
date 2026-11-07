import { Attribute, Component } from '@tsdi/components';
import { getDisplayWidth } from './display-width';
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
        <div class="console-toast-card">
        <label class="console-toast" data-tone="{{item.tone}}" v-for="item in entries">
            <span class="toast-message">{{item.text}}</span><span class="toast-close" role="button" data-cell-width="3" @click="dismiss(item.id, $event)">{{closeAffordance}}</span>
        </label>
        </div>
    </div>`
})
export class ToastStackComponent {
    @Attribute() items: readonly ToastEntry[] = [];
    @Attribute() closeLabel = '✕';
    @Attribute() closeAction?: (id: string) => void;
    /** Inner content width for terminal cards; pads the message so ✕ sits right. */
    @Attribute() messageWidth = 0;

    /** The close glyph carries a leading no-break space: terminal spans do not
     * honour padding, so the gap has to be part of the text run. */
    get closeAffordance(): string {
        return `\u00a0${this.closeLabel}`;
    }

    get entries(): Array<ToastEntry & { text: string }> {
        const items = Array.isArray(this.items) ? this.items : [];
        const width = Math.max(0, Math.floor(Number(this.messageWidth) || 0));
        if (!width) {
            return items.map(item => ({ ...item, text: String(item?.message ?? '') }));
        }
        const closeWidth = getDisplayWidth(this.closeAffordance);
        return items.map(item => {
            const message = String(item?.message ?? '');
            const pad = Math.max(1, width - closeWidth - getDisplayWidth(message));
            return { ...item, text: `${message}${' '.repeat(pad)}` };
        });
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
