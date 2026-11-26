import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { installFieldStyles } from './field.styles';
import { resolveFieldAria } from './field-semantics';

/**
 * Renderer-neutral form field wrapper: label, optional hint/error, required
 * marker and aria linkage. Project the control (input/select/textarea) inside.
 */
@Component({
    selector: 'ui-field-group',
    template: `
    <div class="ui-field-group {{className}}" data-invalid="{{invalid}}" data-status="{{status}}"
        aria-busy="{{pending}}" role="group" aria-describedby="{{describedBy}}">
        <label class="ui-field-group-label" for="{{controlId}}" v-show="label">
            {{label}}<span class="ui-field-group-required" v-if="required" aria-hidden="true"> *</span>
        </label>
        <div class="ui-field-group-control"><v-content></v-content></div>
        <label class="ui-field-group-pending" v-show="pending && !error" role="status">{{pendingLabel}}</label>
        <label class="ui-field-group-hint" id="{{hintId}}" v-show="hint && !error && !pending">{{hint}}</label>
        <label class="ui-field-group-error" id="{{errorId}}" role="alert" v-show="error">{{error}}</label>
    </div>`
})
export class FieldComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installFieldStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() label = '';
    @Attribute() hint = '';
    @Attribute() error = '';
    @Attribute() required = false;
    @Attribute() invalid = false;
    @Attribute() pending = false;
    @Attribute() valid = false;
    @Attribute() pendingLabel = 'Checking…';
    @Attribute() controlId = '';
    @Attribute() hintId = '';
    @Attribute() errorId = '';
    @Attribute() className = '';

    get status(): 'default' | 'pending' | 'valid' | 'invalid' {
        if (this.error || this.invalid) { return 'invalid'; }
        if (this.pending) { return 'pending'; }
        return this.valid ? 'valid' : 'default';
    }

    get describedBy(): string {
        return resolveFieldAria({
            controlId: this.controlId,
            hint: this.hint,
            error: this.error,
            hintId: this.hintId,
            errorId: this.errorId
        }).describedBy;
    }
}
