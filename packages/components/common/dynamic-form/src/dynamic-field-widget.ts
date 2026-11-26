import {
    AfterViewInit,
    Attribute,
    Component,
    ComponentRef,
    OnDestroy,
    ViewChild,
    ViewContainerRef
} from '@tsdi/components';
import { Type } from '@tsdi/ioc';
import type { DynamicFormField } from './dynamic-form.types';

/**
 * Host of one registered `dynamic-form` widget.
 *
 * The widget itself is a normal renderer-neutral component; this host only
 * creates it, forwards the current field/value/error inputs and routes value
 * changes back to the form. Keeping creation here (instead of in the schema)
 * lets the same widget run in DOM and TUI without platform branches.
 */
@Component({
    selector: 'dynamic-field-widget, ui-dynamic-field-widget',
    template: `<span #anchor></span>`
})
export class DynamicFieldWidgetComponent implements AfterViewInit, OnDestroy {
    @ViewChild('anchor', ViewContainerRef) anchor?: ViewContainerRef;

    @Attribute()
    set field(value: DynamicFormField) {
        this._field = value;
    }
    get field(): DynamicFormField { return this._field; }
    protected _field!: DynamicFormField;

    @Attribute()
    set value(value: any) {
        if (value === this._value) {
            return;
        }
        this._value = value;
        this.scheduleSync();
    }
    get value(): any { return this._value; }
    protected _value: any;

    @Attribute()
    set values(value: Record<string, any>) {
        this._values = value || {};
    }
    get values(): Record<string, any> { return this._values; }
    protected _values: Record<string, any> = {};

    @Attribute()
    set disabled(value: boolean | string) {
        this._disabled = !!value && value !== 'false';
    }
    get disabled(): boolean { return this._disabled; }
    protected _disabled = false;

    @Attribute()
    set error(value: string) {
        this._error = String(value || '');
    }
    get error(): string { return this._error; }
    protected _error = '';

    /** List-row index when hosted inside a repeatable field. */
    @Attribute() itemIndex?: number;
    /** Accessible label/id wiring forwarded to the widget control. */
    @Attribute() label = '';
    @Attribute() errorId = '';
    @Attribute() hintId = '';
    @Attribute() describedBy = '';
    @Attribute() required: boolean | string = false;
    /** Value callback; the form owns encoding/validation. */
    @Attribute() changeAction?: (field: DynamicFormField, value: any, itemIndex?: number) => void;

    protected child?: ComponentRef<any>;
    protected componentType?: Type<any>;
    protected destroyed = false;
    protected syncQueued = false;
    protected recreate = false;

    @Attribute()
    get component(): Type<any> | undefined {
        return this.componentType;
    }
    set component(value: Type<any> | undefined) {
        if (value === this.componentType) {
            return;
        }
        this.componentType = value;
        this.recreate = true;
        this.scheduleSync();
    }

    protected inputs(): Record<string, any> {
        return {
            field: this.field,
            value: this.value,
            values: this.values,
            disabled: this.disabled,
            error: this.error,
            changeAction: (next: any) => this.changeAction?.(this.field, next, this.itemIndex),
            label: this.label,
            errorId: this.errorId,
            hintId: this.hintId,
            describedBy: this.describedBy,
            required: this.required
        };
    }

    protected scheduleSync(): void {
        if (this.syncQueued) {
            return;
        }
        this.syncQueued = true;
        Promise.resolve().then(() => {
            this.syncQueued = false;
            if (!this.destroyed) {
                this.sync();
            }
        });
    }

    protected sync(): void {
        if (!this.anchor) {
            return;
        }
        if (this.recreate || !this.child) {
            this.recreate = false;
            this.child?.destroy?.();
            this.child = undefined;
            if (!this.componentType) {
                return;
            }
            this.child = this.anchor.createComponent(this.componentType, { inputs: this.inputs() });
            return;
        }
        Object.assign(this.child.instance as object, this.inputs());
    }

    onAfterViewInit(): void {
        this.scheduleSync();
    }

    onDestroy(): void {
        this.destroyed = true;
        this.child?.destroy?.();
        this.child = undefined;
    }
}
