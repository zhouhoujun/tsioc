import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { focusNth } from '../../src/focus';
import { markElementRefRaw } from '../../src/raw-element';

export type StepStatus = 'pending' | 'active' | 'done' | 'error';
export type StepsOrientation = 'horizontal' | 'vertical';

export interface StepItem {
    id?: string;
    label: string;
    hint?: string;
    status?: StepStatus;
    disabled?: boolean;
}

interface StepViewItem {
    key: string;
    index: number;
    label: string;
    hint: string;
    status: StepStatus;
    marker: string;
    last: boolean;
    disabled: boolean;
    className: string;
}

/**
 * Ordered progress steps (wizard headers, task pipelines).
 *
 * `current` accepts an index or an item id; an explicit item `status` always
 * wins over the derived state. No timers or DOM APIs are involved.
 */
@Component({
    selector: 'ui-steps',
    template: `
    <ol class="ui-steps {{stepsClass}}" aria-label="{{ariaLabel}}">
        <li class="{{stepClass(entry)}}" data-status="{{stepStatus(entry)}}"
            v-for="entry in viewItems" trackBy="key"
            role="{{isInteractive(entry) ? 'button' : 'listitem'}}"
            tabindex="{{isInteractive(entry) ? 0 : -1}}"
            focusable="{{isInteractive(entry)}}"
            aria-disabled="{{entry.disabled}}"
            aria-current="{{stepStatus(entry) === 'active' ? 'step' : ''}}"
            @click="pick(entry)" @keydown="onKeydown(entry, $event)">
            <span class="ui-step-marker" aria-hidden="true">{{stepMarker(entry)}}</span>
            <span class="ui-step-copy">
                <span class="ui-step-label">{{entry.label}}</span>
                <span class="ui-step-hint" v-if="entry.hint">{{entry.hint}}</span>
            </span>
            <span class="ui-step-connector" aria-hidden="true" v-if="!entry.last">{{connector}}</span>
        </li>
    </ol>`
})
export class StepsComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    @Attribute() items: StepItem[] = [];
    @Attribute() current: number | string = 0;
    @Attribute() orientation: StepsOrientation = 'horizontal';
    @Attribute() connector = '─';
    @Attribute() ariaLabel = 'Steps';
    @Attribute() className = '';
    @Attribute() action?: (item: StepItem, index: number) => void;

    get stepsClass(): string {
        return [`is-${this.orientation}`, this.className].filter(Boolean).join(' ');
    }

    get viewItems(): StepViewItem[] {
        const items = Array.isArray(this.items) ? this.items : [];
        const currentIndex = this.currentIndex(items);
        return items.map((item, index) => {
            const status = this.resolveStatus(item, index, currentIndex);
            return {
                key: String(item?.id ?? index),
                index,
                label: String(item?.label ?? ''),
                hint: String(item?.hint ?? ''),
                status,
                marker: this.markerFor(status, index),
                last: index === items.length - 1,
                disabled: item?.disabled === true,
                className: [
                    'ui-step',
                    `is-${status}`,
                    item?.disabled ? 'is-disabled' : '',
                    index === currentIndex ? 'is-current' : ''
                ].filter(Boolean).join(' ')
            };
        });
    }

    stepStatus(entry: StepViewItem): StepStatus {
        const item = this.items[entry.index];
        const currentIndex = this.currentIndex(this.items);
        return this.resolveStatus(item, entry.index, currentIndex);
    }

    stepClass(entry: StepViewItem): string {
        const status = this.stepStatus(entry);
        const currentIndex = this.currentIndex(this.items);
        return [
            'ui-step',
            `is-${status}`,
            entry.disabled ? 'is-disabled' : '',
            entry.index === currentIndex ? 'is-current' : ''
        ].filter(Boolean).join(' ');
    }

    stepMarker(entry: StepViewItem): string {
        return this.markerFor(this.stepStatus(entry), entry.index);
    }

    isInteractive(entry: StepViewItem): boolean {
        return !!this.action && !!entry && !entry.disabled;
    }

    pick(entry: StepViewItem): void {
        if (!entry || entry.disabled || !this.action) {
            return;
        }
        focusNth(this.elementRef?.nativeElement, '.ui-step', entry.index);
        this.action(this.items[entry.index], entry.index);
    }

    onKeydown(entry: StepViewItem, event: any): void {
        if (!this.isInteractive(entry)) {
            return;
        }
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            this.pick(entry);
        }
    }

    private currentIndex(items: StepItem[]): number {
        const current = this.current;
        if (typeof current === 'string' && current) {
            const index = items.findIndex(item => String(item?.id ?? '') === current);
            return index < 0 ? 0 : index;
        }
        const index = Math.floor(Number(current));
        return Number.isFinite(index) ? Math.max(0, Math.min(items.length - 1, index)) : 0;
    }

    private resolveStatus(item: StepItem, index: number, currentIndex: number): StepStatus {
        if (item?.status) {
            return item.status;
        }
        if (index < currentIndex) {
            return 'done';
        }
        return index === currentIndex ? 'active' : 'pending';
    }

    private markerFor(status: StepStatus, index: number): string {
        if (status === 'done') {
            return '✓';
        }
        if (status === 'error') {
            return '!';
        }
        return String(index + 1);
    }
}
