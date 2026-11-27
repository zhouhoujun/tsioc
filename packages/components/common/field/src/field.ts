import { Attribute, Component, ContentChild, ElementRef } from '@tsdi/components';
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
        <label class="ui-field-group-label" id="{{resolvedLabelId}}" for="{{controlId}}" v-show="label">
            {{label}}<span class="ui-field-group-required" v-if="required" aria-hidden="true"> *</span>
            <span class="ui-field-group-info" id="{{resolvedTooltipId}}" role="note" tabindex="0"
                title="{{labelTooltip}}" v-if="labelTooltip">ⓘ</span>
        </label>
        <div class="ui-field-group-row">
            <span class="ui-field-group-prefix" id="{{resolvedPrefixId}}"><v-content slot="prefix"></v-content></span>
            <div class="ui-field-group-control"><v-content></v-content></div>
            <span class="ui-field-group-suffix" id="{{resolvedSuffixId}}"><v-content slot="suffix"></v-content></span>
        </div>
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
    @Attribute() labelId = '';
    @Attribute() tooltipId = '';
    @Attribute() prefixId = '';
    @Attribute() suffixId = '';
    @Attribute() className = '';
    /** Short explanation rendered as a focusable info affordance beside the label. */
    @Attribute() labelTooltip = '';

    get resolvedLabelId(): string {
        return this.labelId || (this.controlId ? `${this.controlId}-label` : '');
    }

    get resolvedTooltipId(): string {
        return this.tooltipId || (this.controlId ? `${this.controlId}-tooltip` : '');
    }

    get resolvedPrefixId(): string {
        return this.prefixId || (this.controlId ? `${this.controlId}-prefix` : '');
    }

    get resolvedSuffixId(): string {
        return this.suffixId || (this.controlId ? `${this.controlId}-suffix` : '');
    }

    @ContentChild('[slot="prefix"]') prefixNode?: ElementRef;
    @ContentChild('[slot="suffix"]') suffixNode?: ElementRef;

    get status(): 'default' | 'pending' | 'valid' | 'invalid' {
        if (this.error || this.invalid) { return 'invalid'; }
        if (this.pending) { return 'pending'; }
        return this.valid ? 'valid' : 'default';
    }

    get describedBy(): string {
        const base = resolveFieldAria({
            controlId: this.controlId,
            hint: this.hint,
            error: this.error,
            hintId: this.hintId,
            errorId: this.errorId
        }).describedBy;
        return [
            this.prefixNode ? this.resolvedPrefixId : '',
            base,
            this.suffixNode ? this.resolvedSuffixId : ''
        ].filter(Boolean).join(' ');
    }
}
