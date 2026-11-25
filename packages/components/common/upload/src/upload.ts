import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean } from '../../src/ui';
import { installPlainButtonStyles } from '../../src/ui.styles';
import { installUploadStyles } from './upload.styles';

export interface UploadFile {
    name: string;
    size?: string | number;
    status?: 'ready' | 'uploading' | 'done' | 'error';
}

/**
 * Upload surface (Ant Design Upload).
 *
 * File I/O stays with the host: `pickAction` opens the platform picker, while
 * this component renders the trigger, hint and removable file list identically
 * in browsers and terminals.
 */
@Component({
    selector: 'ui-upload',
    template: `
    <div class="ui-upload {{uploadClass}}" role="group" aria-label="{{ariaLabel}}">
        <span class="ui-upload-trigger" role="button"
            tabindex="{{disabled ? -1 : 0}}" focusable="{{!disabled}}"
            aria-disabled="{{disabled}}"
            @click="pick" @keydown="onTriggerKeydown($event)">
            <span class="ui-upload-glyph" aria-hidden="true">＋</span>
            <span class="ui-upload-label">{{label}}</span>
        </span>
        <span class="ui-upload-hint" v-if="hint">{{hint}}</span>
        <span class="ui-upload-file" v-for="file in viewFiles" trackBy="name">
            <span class="ui-upload-name">{{file.name}}</span>
            <span class="ui-upload-size" v-if="file.size">{{file.size}}</span>
            <button class="ui-upload-remove ui-plain-button" type="button" data-plain="true"
                v-if="!disabled" aria-label="{{removeLabel}}" @click="remove(file, $event)"
                @keydown="onRemoveKeydown($event, file)">{{removeGlyph}}</button>
        </span>
    </div>`
})
export class UploadComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        const doc = (this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument;
        installUploadStyles(doc);
        installPlainButtonStyles(doc);
    }

    @Attribute() label = 'Upload';
    @Attribute() hint = '';
    @Attribute() accept = '';
    @Attribute() removeLabel = 'Remove file';
    @Attribute() ariaLabel = 'Upload';
    @Attribute() className = '';
    @Attribute() files: Array<UploadFile | string> = [];
    @Attribute() pickAction?: () => void;
    @Attribute() removeAction?: (name: string) => void;

    private _disabled = false;
    private _multiple = false;

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    @Attribute()
    get multiple(): boolean { return this._multiple; }
    set multiple(value: boolean | string) { this._multiple = normalizeBoolean(value); }

    get removeGlyph(): string {
        return '✕';
    }

    get uploadClass(): string {
        return [this._disabled ? 'is-disabled' : '', this.className].filter(Boolean).join(' ');
    }

    get viewFiles(): UploadFile[] {
        return (Array.isArray(this.files) ? this.files : []).map(file => {
            if (typeof file === 'string') {
                return { name: file };
            }
            return {
                name: String(file?.name ?? ''),
                size: file?.size == null ? '' : String(file.size),
                status: file?.status || 'ready'
            };
        });
    }

    pick(): void {
        if (this._disabled) {
            return;
        }
        this.pickAction?.();
    }

    remove(file: UploadFile, event?: Event): void {
        event?.stopPropagation?.();
        if (this._disabled) {
            return;
        }
        this.removeAction?.(file.name);
    }

    onTriggerKeydown(event: any): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            this.pick();
        }
    }

    onRemoveKeydown(event: any, file: UploadFile): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            this.remove(file, event);
        }
    }
}
