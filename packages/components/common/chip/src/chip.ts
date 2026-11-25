import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { iconSizeFor, normalizeBoolean, normalizeSize, normalizeTone, UiSize, UiTone } from '../../src/ui';
import { markElementRefRaw } from '../../src/raw-element';
import { installPlainButtonStyles } from '../../src/ui.styles';
import { installChipStyles } from './chip.styles';

export type ChipVariant = 'solid' | 'outline' | 'ghost';

/**
 * Removable/actionable compact entity (Ant Design Tag closable / MUI Chip).
 *
 * The close affordance is a real `<button data-plain>`: browser hosts get a
 * normal focusable button, terminal hosts paint it inline (`✕`), matching the
 * dialog close affordance.
 */
@Component({
    selector: 'ui-chip',
    template: `
    <span class="ui-chip {{chipClass}}" data-tone="{{tone}}"
        role="{{role}}"
        aria-label="{{ariaLabel || label}}"
        aria-disabled="{{disabled}}"
        aria-pressed="{{interactive ? selected : ''}}"
        tabindex="{{tabIndexValue}}"
        focusable="{{interactive}}"
        @click="activate"
        @keydown="onKeydown($event)">
        <icon v-if="icon" [name]="icon" [glyph]="iconGlyph || icon" [size]="iconSize"></icon>
        <span class="ui-chip-label" v-if="label">{{label}}</span>
        <v-content></v-content>
        <button class="ui-chip-close ui-plain-button" type="button" data-plain="true"
            v-if="closable"
            aria-label="{{closeLabel}}"
            [disabled]="disabled"
            @click="remove($event)"
            @keydown="closeKeydown($event)">{{closeGlyph}}</button>
    </span>`
})
export class ChipComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        const doc = (this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument;
        installChipStyles(doc);
        installPlainButtonStyles(doc);
    }

    @Attribute() label = '';
    @Attribute() icon = '';
    @Attribute() iconGlyph = '';
    @Attribute() ariaLabel = '';
    @Attribute() closeLabel = 'Remove';
    @Attribute() className = '';
    @Attribute() action?: () => void;
    @Attribute() removeAction?: () => void;

    private _tone: UiTone = 'default';
    private _size: UiSize = 'sm';
    private _variant: ChipVariant = 'ghost';
    private _selected = false;
    private _disabled = false;
    private _closable = false;

    @Attribute()
    get tone(): UiTone { return this._tone; }
    set tone(value: string) { this._tone = normalizeTone(value); }

    @Attribute()
    get size(): UiSize { return this._size; }
    set size(value: string) { this._size = normalizeSize(value, 'sm'); }

    @Attribute()
    get variant(): ChipVariant { return this._variant; }
    set variant(value: string) {
        this._variant = value === 'solid' || value === 'outline' ? value : 'ghost';
    }

    @Attribute()
    get selected(): boolean { return this._selected; }
    set selected(value: boolean | string) { this._selected = normalizeBoolean(value); }

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    @Attribute()
    get closable(): boolean { return this._closable; }
    set closable(value: boolean | string) { this._closable = normalizeBoolean(value); }

    get interactive(): boolean {
        return !!this.action && !this._disabled;
    }

    get tabIndexValue(): number {
        return this.interactive ? 0 : -1;
    }

    get role(): 'button' | 'group' {
        return this.action ? 'button' : 'group';
    }

    get iconSize(): 'xs' | 'sm' | 'md' | 'lg' {
        return iconSizeFor(this._size);
    }

    get closeGlyph(): string {
        return '✕';
    }

    get chipClass(): string {
        return [
            `is-${this._tone}`,
            `is-${this._variant}`,
            `is-${this._size}`,
            this._selected ? 'is-selected' : '',
            this._disabled ? 'is-disabled' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    activate(): void {
        if (this._disabled || !this.action) {
            return;
        }
        this.action();
    }

    remove(event?: Event): void {
        event?.stopPropagation?.();
        if (this._disabled || !this._closable) {
            return;
        }
        this.removeAction?.();
    }

    onKeydown(event: any): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event?.preventDefault?.();
            this.activate();
        }
    }

    closeKeydown(event: any): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event?.preventDefault?.();
            this.remove(event);
        }
    }
}
