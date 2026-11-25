import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean } from '../../src/ui';
import { installTransferStyles } from './transfer.styles';

export interface TransferItem {
    key: string;
    label: string;
    description?: string;
    disabled?: boolean;
}

export type TransferDirection = 'left' | 'right';

interface TransferViewItem {
    key: string;
    label: string;
    description: string;
    disabled: boolean;
    selected: boolean;
    className: string;
}

/**
 * Two-pane transfer list (Ant Design Transfer).
 *
 * Moving updates `targetKeys` and emits `changeAction(next, direction, moved)`.
 * Browsers lay the panes side by side; terminal hosts stack source, actions and
 * target, keeping the same labels, selection state and move semantics.
 */
@Component({
    selector: 'ui-transfer',
    template: `
    <div class="ui-transfer {{transferClass}}" role="group" aria-label="{{ariaLabel}}">
        <div class="ui-transfer-pane is-source" role="group" aria-label="{{sourceTitle}}">
            <div class="ui-transfer-header">{{sourceTitle}} ({{sourceItems.length}})</div>
            <div class="ui-transfer-list" role="listbox" aria-multiselectable="true">
                <span class="{{item.className}}" role="option" aria-selected="{{item.selected}}"
                    aria-disabled="{{item.disabled}}" tabindex="0" focusable="{{!item.disabled}}"
                    v-for="item in sourceItems" trackBy="key"
                    @click="toggleSource(item)" @keydown="onItemKeydown(item, 'source', $event)">
                    <span class="ui-transfer-label">{{item.label}}</span><span class="ui-transfer-description" v-if="item.description"> {{item.description}}</span>
                </span>
                <span class="ui-transfer-empty" v-if="!sourceItems.length">{{emptyLabel}}</span>
            </div>
        </div>
        <div class="ui-transfer-actions">
            <span class="ui-transfer-action" role="button"
                tabindex="{{canMoveRight ? 0 : -1}}" focusable="{{canMoveRight}}"
                aria-label="{{moveRightLabel}}" aria-disabled="{{!canMoveRight}}"
                @click="moveRight" @keydown="onActionKeydown($event, 'right', false)">→</span>
            <span class="ui-transfer-action" role="button"
                tabindex="{{canMoveLeft ? 0 : -1}}" focusable="{{canMoveLeft}}"
                aria-label="{{moveLeftLabel}}" aria-disabled="{{!canMoveLeft}}"
                @click="moveLeft" @keydown="onActionKeydown($event, 'left', false)">←</span>
            <span class="ui-transfer-action" role="button"
                tabindex="{{canMoveAllRight ? 0 : -1}}" focusable="{{canMoveAllRight}}"
                aria-label="{{moveAllRightLabel}}" aria-disabled="{{!canMoveAllRight}}"
                @click="moveAllRight" @keydown="onActionKeydown($event, 'right', true)">»</span>
            <span class="ui-transfer-action" role="button"
                tabindex="{{canMoveAllLeft ? 0 : -1}}" focusable="{{canMoveAllLeft}}"
                aria-label="{{moveAllLeftLabel}}" aria-disabled="{{!canMoveAllLeft}}"
                @click="moveAllLeft" @keydown="onActionKeydown($event, 'left', true)">«</span>
        </div>
        <div class="ui-transfer-pane is-target" role="group" aria-label="{{targetTitle}}">
            <div class="ui-transfer-header">{{targetTitle}} ({{targetItems.length}})</div>
            <div class="ui-transfer-list" role="listbox" aria-multiselectable="true">
                <span class="{{item.className}}" role="option" aria-selected="{{item.selected}}"
                    aria-disabled="{{item.disabled}}" tabindex="0" focusable="{{!item.disabled}}"
                    v-for="item in targetItems" trackBy="key"
                    @click="toggleTarget(item)" @keydown="onItemKeydown(item, 'target', $event)">
                    <span class="ui-transfer-label">{{item.label}}</span><span class="ui-transfer-description" v-if="item.description"> {{item.description}}</span>
                </span>
                <span class="ui-transfer-empty" v-if="!targetItems.length">{{emptyLabel}}</span>
            </div>
        </div>
    </div>`
})
export class TransferComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installTransferStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() items: TransferItem[] = [];
    @Attribute() targetKeys: Array<string | number> = [];
    @Attribute() sourceTitle = 'Source';
    @Attribute() targetTitle = 'Target';
    @Attribute() emptyLabel = 'No items';
    @Attribute() ariaLabel = 'Transfer';
    @Attribute() moveRightLabel = 'Move to target';
    @Attribute() moveLeftLabel = 'Move to source';
    @Attribute() moveAllRightLabel = 'Move all to target';
    @Attribute() moveAllLeftLabel = 'Move all to source';
    @Attribute() className = '';
    @Attribute() changeAction?: (targetKeys: string[], direction: TransferDirection, movedKeys: string[]) => void;

    private _disabled = false;
    private sourceSelected: string[] = [];
    private targetSelected: string[] = [];

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    get transferClass(): string {
        return [this._disabled ? 'is-disabled' : '', this.className].filter(Boolean).join(' ');
    }

    get sourceItems(): TransferViewItem[] {
        const target = this.targetKeySet();
        return this.allItems()
            .filter(item => !target.has(item.key))
            .map(item => this.viewItem(item, this.sourceSelected.includes(item.key)));
    }

    get targetItems(): TransferViewItem[] {
        const target = this.targetKeySet();
        return this.allItems()
            .filter(item => target.has(item.key))
            .map(item => this.viewItem(item, this.targetSelected.includes(item.key)));
    }

    get canMoveRight(): boolean {
        return !this._disabled && this.sourceSelected.length > 0;
    }

    get canMoveLeft(): boolean {
        return !this._disabled && this.targetSelected.length > 0;
    }

    get canMoveAllRight(): boolean {
        return !this._disabled && this.sourceItems.some(item => !item.disabled);
    }

    get canMoveAllLeft(): boolean {
        return !this._disabled && this.targetItems.some(item => !item.disabled);
    }

    toggleSource(item: TransferViewItem): void {
        if (this._disabled || item.disabled) {
            return;
        }
        this.sourceSelected = this.toggleKey(this.sourceSelected, item.key);
    }

    toggleTarget(item: TransferViewItem): void {
        if (this._disabled || item.disabled) {
            return;
        }
        this.targetSelected = this.toggleKey(this.targetSelected, item.key);
    }

    moveRight(): void {
        this.move('right', this.sourceSelected);
    }

    moveLeft(): void {
        this.move('left', this.targetSelected);
    }

    moveAllRight(): void {
        this.move('right', this.sourceItems.filter(item => !item.disabled).map(item => item.key));
    }

    moveAllLeft(): void {
        this.move('left', this.targetItems.filter(item => !item.disabled).map(item => item.key));
    }

    onItemKeydown(item: TransferViewItem, side: 'source' | 'target', event: any): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            if (side === 'source') {
                this.toggleSource(item);
            } else {
                this.toggleTarget(item);
            }
        }
    }

    onActionKeydown(event: any, direction: TransferDirection, all: boolean): void {
        if (event?.key !== 'Enter' && event?.key !== ' ' && event?.key !== 'Spacebar') {
            return;
        }
        event.preventDefault?.();
        if (direction === 'right') {
            all ? this.moveAllRight() : this.moveRight();
        } else {
            all ? this.moveAllLeft() : this.moveLeft();
        }
    }

    protected move(direction: TransferDirection, keys: string[]): void {
        if (this._disabled || !keys.length) {
            return;
        }
        const target = this.targetKeySet();
        const moved = keys.filter(key => {
            if (direction === 'right') {
                return !target.has(key);
            }
            return target.has(key);
        });
        if (!moved.length) {
            return;
        }
        moved.forEach(key => direction === 'right' ? target.add(key) : target.delete(key));
        const next = this.allItems().map(item => item.key).filter(key => target.has(key));
        this.targetKeys = next;
        if (direction === 'right') {
            this.sourceSelected = this.sourceSelected.filter(key => !moved.includes(key));
        } else {
            this.targetSelected = this.targetSelected.filter(key => !moved.includes(key));
        }
        this.changeAction?.(next, direction, moved);
    }

    protected allItems(): TransferViewItem[] {
        return (Array.isArray(this.items) ? this.items : [])
            .filter(item => !!item)
            .map(item => this.viewItem(item, false));
    }

    protected viewItem(item: TransferItem, selected: boolean): TransferViewItem {
        const key = String(item.key);
        const disabled = this._disabled || item.disabled === true;
        return {
            key,
            label: String(item.label ?? ''),
            description: String(item.description ?? ''),
            disabled,
            selected,
            className: [
                'ui-transfer-item',
                selected ? 'is-selected' : '',
                disabled ? 'is-disabled' : ''
            ].filter(Boolean).join(' ')
        };
    }

    protected targetKeySet(): Set<string> {
        return new Set((Array.isArray(this.targetKeys) ? this.targetKeys : []).map(key => String(key)));
    }

    protected toggleKey(keys: string[], key: string): string[] {
        return keys.includes(key) ? keys.filter(entry => entry !== key) : [...keys, key];
    }
}
