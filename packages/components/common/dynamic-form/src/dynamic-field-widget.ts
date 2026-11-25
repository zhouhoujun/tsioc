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

    @Attribute() field!: DynamicFormField;
    @Attribute() value: any;
    @Attribute() values: Record<string, any> = {};
    @Attribute() disabled = false;
    @Attribute() error = '';
    /** Value callback; the form owns encoding/validation. */
    @Attribute() changeAction?: (field: DynamicFormField, value: any) => void;

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
            changeAction: (next: any) => this.changeAction?.(this.field, next)
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
