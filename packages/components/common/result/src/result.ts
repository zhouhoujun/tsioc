import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeTone, UiTone } from '../../src/ui';
import { installResultStyles } from './result.styles';

export type ResultStatus = 'success' | 'error' | 'info' | 'warning' | '403' | '404' | '500';

/**
 * Full-page operation result (Ant Design Result).
 *
 * Status glyph, title, subtitle and lines are plain text, so DOM and terminal
 * hosts paint the same content. The optional action is focusable in both.
 */
@Component({
    selector: 'ui-result',
    template: `
    <div class="ui-result is-{{status}} {{resultClass}}" role="status"
        aria-label="{{ariaLabel || title}}" data-tone="{{tone}}">
        <span class="ui-result-icon" aria-hidden="true">{{glyph}}</span>
        <span class="ui-result-title" v-if="title">{{title}}</span>
        <span class="ui-result-subtitle" v-if="subTitle">{{subTitle}}</span>
        <span class="ui-result-line" v-for="line in viewLines">{{line}}</span>
        <span class="ui-result-action" role="{{actionLabel ? 'button' : 'none'}}"
            tabindex="{{actionLabel ? 0 : -1}}" focusable="{{!!actionLabel}}"
            v-if="actionLabel" @click="runAction" @keydown="onKeydown($event)">{{actionLabel}}</span>
        <v-content></v-content>
    </div>`
})
export class ResultComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installResultStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() status: ResultStatus = 'info';
    @Attribute() title = '';
    @Attribute() subTitle = '';
    @Attribute() lines: string[] = [];
    @Attribute() actionLabel = '';
    @Attribute() ariaLabel = '';
    @Attribute() className = '';
    @Attribute() action?: () => void;

    get statusValue(): ResultStatus {
        return ['success', 'error', 'info', 'warning', '403', '404', '500'].includes(this.status)
            ? this.status
            : 'info';
    }

    get tone(): UiTone {
        return normalizeTone(this.statusValue === 'success' ? 'success'
            : this.statusValue === 'error' || this.statusValue === '500' ? 'danger'
                : this.statusValue === 'warning' || this.statusValue === '404' || this.statusValue === '403' ? 'warning'
                    : 'accent');
    }

    get glyph(): string {
        switch (this.statusValue) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'warning': return '!';
            case '404': return '404';
            case '403': return '403';
            case '500': return '500';
            default: return 'ℹ';
        }
    }

    get resultClass(): string {
        return [this.className].filter(Boolean).join(' ');
    }

    get viewLines(): string[] {
        return Array.isArray(this.lines) ? this.lines.map(line => String(line ?? '')) : [];
    }

    runAction(): void {
        this.action?.();
    }

    onKeydown(event: any): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            this.runAction();
        }
    }
}
