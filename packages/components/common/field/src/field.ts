import { Attribute, Component } from '@tsdi/components';

/**
 * Renderer-neutral form field wrapper: label, optional hint/error, required
 * marker and aria linkage. Project the control (input/select/textarea) inside.
 */
@Component({
    selector: 'ui-field-group',
    template: `
    <div class="ui-field-group {{className}}" data-invalid="{{invalid}}" role="group"
        aria-describedby="{{describedBy}}">
        <label class="ui-field-group-label" for="{{controlId}}" v-show="label">
            {{label}}<span class="ui-field-group-required" v-if="required" aria-hidden="true"> *</span>
        </label>
        <div class="ui-field-group-control"><v-content></v-content></div>
        <label class="ui-field-group-hint" id="{{hintId}}" v-show="hint && !error">{{hint}}</label>
        <label class="ui-field-group-error" id="{{errorId}}" role="alert" v-show="error">{{error}}</label>
    </div>`
})
export class FieldComponent {
    @Attribute() label = '';
    @Attribute() hint = '';
    @Attribute() error = '';
    @Attribute() required = false;
    @Attribute() invalid = false;
    @Attribute() controlId = '';
    @Attribute() hintId = '';
    @Attribute() errorId = '';
    @Attribute() className = '';

    get describedBy(): string {
        return [this.hint && !this.error ? this.hintId : '', this.error ? this.errorId : ''].filter(Boolean).join(' ');
    }
}
