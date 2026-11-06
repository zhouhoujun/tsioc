import { Attribute, Directive, ElementRef } from '@tsdi/components';
import type { OnDestroy } from '@tsdi/ioc';
import { FormControl, FormGroup } from './control';

/** Binds a reactive FormControl to a native input/value element. */
@Directive({ selector: '[formControl]' })
export class FormControlDirective implements OnDestroy {
    protected control?: FormControl;
    protected subscription?: { unsubscribe(): void };
    protected statusSubscription?: { unsubscribe(): void };
    protected readonly handleInput = (): void => {
        if (!this.control) return;
        const value = (this.elementRef.nativeElement as any)?.value;
        this.control.setValue(value);
        this.control.markAsDirty();
        this.control.markAsTouched();
    };

    constructor(protected elementRef: ElementRef) {
        const element = this.elementRef?.nativeElement as any;
        element?.addEventListener?.('input', this.handleInput);
        element?.addEventListener?.('change', this.handleInput);
    }

    @Attribute()
    set formControl(control: FormControl | undefined) {
        this.subscription?.unsubscribe();
        this.statusSubscription?.unsubscribe();
        this.control = control;
        if (!control) return;
        this.writeValue(control.value);
        this.subscription = control.valueChanges.subscribe(value => this.writeValue(value));
        this.statusSubscription = control.statusChanges.subscribe(() => this.syncValidity());
        this.syncValidity();
    }

    get formControl(): FormControl | undefined { return this.control; }

    onDestroy(): void {
        this.subscription?.unsubscribe();
        this.statusSubscription?.unsubscribe();
        const element = this.elementRef?.nativeElement as any;
        element?.removeEventListener?.('input', this.handleInput);
        element?.removeEventListener?.('change', this.handleInput);
    }

    protected writeValue(value: any): void {
        const element = this.elementRef?.nativeElement as any;
        if (element && element.value !== value) {
            element.value = value ?? '';
        }
    }

    protected syncValidity(): void {
        const element = this.elementRef?.nativeElement as any;
        const invalid = !!this.control?.invalid;
        element?.setAttribute?.('aria-invalid', invalid ? 'true' : 'false');
        if (invalid) {
            element?.classList?.add?.('is-invalid');
        } else {
            element?.classList?.remove?.('is-invalid');
        }
    }
}

/** Exposes a reactive FormGroup to descendant form controls. */
@Directive({ selector: '[formGroup]' })
export class FormGroupDirective {
    protected group?: FormGroup;

    @Attribute()
    set formGroup(group: FormGroup | undefined) { this.group = group; }
    get formGroup(): FormGroup | undefined { return this.group; }
    get value(): any { return this.group?.value; }
    get valid(): boolean { return this.group?.valid !== false; }
}
