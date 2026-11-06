import { EventEmitter } from '@tsdi/components';
import { AsyncValidatorFn, ValidationErrors, ValidatorFn } from './validators';

export type ControlStatus = 'VALID' | 'INVALID' | 'PENDING' | 'DISABLED';

export interface ControlOptions {
    validators?: ValidatorFn | ValidatorFn[] | null;
    asyncValidators?: AsyncValidatorFn | AsyncValidatorFn[] | null;
}

export interface UpdateOptions {
    emitEvent?: boolean;
    onlySelf?: boolean;
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
}

export abstract class AbstractControl<T = any> {
    protected _value!: T;
    protected _status: ControlStatus = 'VALID';
    protected _errors: ValidationErrors = null;
    protected _validators: ValidatorFn[] = [];
    protected _asyncValidators: AsyncValidatorFn[] = [];
    protected _parent?: AbstractControl;
    protected _asyncSequence = 0;

    readonly valueChanges = new EventEmitter<T>();
    readonly statusChanges = new EventEmitter<ControlStatus>();

    touched = false;
    dirty = false;

    constructor(validators?: ValidatorFn | ValidatorFn[] | null, asyncValidators?: AsyncValidatorFn | AsyncValidatorFn[] | null) {
        this._validators = asArray(validators);
        this._asyncValidators = asArray(asyncValidators);
    }

    get value(): T { return this._value; }
    get status(): ControlStatus { return this._status; }
    get errors(): ValidationErrors { return this._errors; }
    get valid(): boolean { return this._status === 'VALID'; }
    get invalid(): boolean { return this._status === 'INVALID'; }
    get pending(): boolean { return this._status === 'PENDING'; }
    get disabled(): boolean { return this._status === 'DISABLED'; }
    get parent(): AbstractControl | undefined { return this._parent; }

    setParent(parent?: AbstractControl): void { this._parent = parent; }

    abstract setValue(value: any, options?: UpdateOptions): void;

    patchValue(value: any, options?: UpdateOptions): void {
        this.setValue(value, options);
    }

    setValidators(validators?: ValidatorFn | ValidatorFn[] | null): void {
        this._validators = asArray(validators);
        this.updateValueAndValidity();
    }

    addValidators(validators: ValidatorFn | ValidatorFn[]): void {
        this._validators = [...this._validators, ...asArray(validators)];
        this.updateValueAndValidity();
    }

    clearValidators(): void {
        this._validators = [];
        this.updateValueAndValidity();
    }

    setAsyncValidators(validators?: AsyncValidatorFn | AsyncValidatorFn[] | null): void {
        this._asyncValidators = asArray(validators);
        this.updateValueAndValidity();
    }

    markAsTouched(): void { this.touched = true; }
    markAsUntouched(): void { this.touched = false; }
    markAsDirty(): void { this.dirty = true; }
    markAsPristine(): void { this.dirty = false; }

    markAllAsTouched(): void {
        this.markAsTouched();
    }

    reset(value?: any, options: UpdateOptions = { emitEvent: true }): void {
        this.markAsPristine();
        this.markAsUntouched();
        this.setValue(value, options);
    }

    disable(options: UpdateOptions = { emitEvent: true }): void {
        this.setDisabled(true, options);
    }

    enable(options: UpdateOptions = { emitEvent: true }): void {
        this.setDisabled(false, options);
    }

    protected setDisabled(disabled: boolean, options: UpdateOptions): void {
        this._status = disabled ? 'DISABLED' : 'VALID';
        if (disabled) {
            this._errors = null;
        } else {
            this.updateValueAndValidity(options);
            return;
        }
        if (options.emitEvent !== false) {
            this.statusChanges.emit(this._status);
        }
    }

    updateValueAndValidity(options: UpdateOptions = { emitEvent: true }): void {
        if (this._status === 'DISABLED') {
            this._errors = null;
            if (options.emitEvent !== false) {
                this.statusChanges.emit(this._status);
            }
            return;
        }
        const syncErrors = this.runSyncValidators();
        if (this._asyncValidators.length) {
            this._status = 'PENDING';
            this._errors = syncErrors;
            if (options.emitEvent !== false) {
                this.statusChanges.emit(this._status);
            }
            const sequence = ++this._asyncSequence;
            void Promise.all(this._asyncValidators.map(validator => validator(this)))
                .then(results => {
                    if (sequence !== this._asyncSequence) {
                        return;
                    }
                    this._errors = this.mergeErrors(syncErrors, ...results);
                    this._status = this._errors ? 'INVALID' : 'VALID';
                    if (options.emitEvent !== false) {
                        this.statusChanges.emit(this._status);
                    }
                    this.notifyParent(options);
                })
                .catch(() => {
                    if (sequence !== this._asyncSequence) {
                        return;
                    }
                    this._errors = { ...(syncErrors || {}), async: true };
                    this._status = 'INVALID';
                    if (options.emitEvent !== false) {
                        this.statusChanges.emit(this._status);
                    }
                    this.notifyParent(options);
                });
            return;
        }
        this._errors = syncErrors;
        this._status = this._errors ? 'INVALID' : 'VALID';
        if (options.emitEvent !== false) {
            this.statusChanges.emit(this._status);
        }
        this.notifyParent(options);
    }

    protected notifyParent(options: UpdateOptions): void {
        if (!options.onlySelf && this._parent) {
            this._parent.updateValueAndValidity({ ...options, onlySelf: false });
        }
    }

    protected runSyncValidators(): ValidationErrors {
        return this.mergeErrors(...this._validators.map(validator => validator(this)));
    }

    protected mergeErrors(...results: ValidationErrors[]): ValidationErrors {
        const errors = results.filter(Boolean).reduce<Record<string, any>>((all, item) => ({ ...all, ...item }), {});
        return Object.keys(errors).length ? errors : null;
    }
}

export class FormControl<T = any> extends AbstractControl<T> {
    constructor(value: T | null = null, validators?: ValidatorFn | ValidatorFn[] | ControlOptions | null, asyncValidators?: AsyncValidatorFn | AsyncValidatorFn[] | null) {
        const options = isControlOptions(validators) ? validators : undefined;
        super(options?.validators ?? (validators as ValidatorFn | ValidatorFn[] | null), options?.asyncValidators ?? asyncValidators);
        this._value = value as T;
        this.updateValueAndValidity({ emitEvent: false });
    }

    setValue(value: T, options: UpdateOptions = { emitEvent: true }): void {
        this._value = value;
        if (options.emitEvent !== false) {
            this.valueChanges.emit(value);
        }
        this.updateValueAndValidity(options);
    }

    override reset(value: T | null = null, options: UpdateOptions = { emitEvent: true }): void {
        super.reset(value, options);
    }
}

export class FormGroup extends AbstractControl<Record<string, any>> {
    readonly controls: Record<string, AbstractControl>;

    constructor(controls: Record<string, AbstractControl> = {}, validators?: ValidatorFn | ValidatorFn[] | ControlOptions | null, asyncValidators?: AsyncValidatorFn | AsyncValidatorFn[] | null) {
        const options = isControlOptions(validators) ? validators : undefined;
        super(options?.validators ?? (validators as ValidatorFn | ValidatorFn[] | null), options?.asyncValidators ?? asyncValidators);
        this.controls = controls;
        Object.values(controls).forEach(control => control.setParent(this));
        this._value = this.reduceValue();
        this.updateValueAndValidity({ emitEvent: false });
    }

    get(path: string): AbstractControl | null {
        const parts = String(path || '').split('.').filter(Boolean);
        let current: any = this;
        for (const part of parts) {
            if (!current) return null;
            current = current.controls?.[part];
        }
        return current || null;
    }

    addControl(name: string, control: AbstractControl): void {
        control.setParent(this);
        this.controls[name] = control;
        this.updateValueAndValidity();
    }

    removeControl(name: string): void {
        if (!this.controls[name]) return;
        delete this.controls[name];
        this.updateValueAndValidity();
    }

    setControl(name: string, control: AbstractControl): void {
        if (!this.controls[name]) return;
        this.controls[name] = control;
        control.setParent(this);
        this.updateValueAndValidity();
    }

    contains(name: string): boolean { return !!this.controls[name]; }

    override updateValueAndValidity(options: UpdateOptions = { emitEvent: true }): void {
        this._value = this.reduceValue();
        super.updateValueAndValidity(options);
    }

    setValue(value: Record<string, any>, options: UpdateOptions = { emitEvent: true }): void {
        Object.keys(this.controls).forEach(key => this.controls[key].setValue(value?.[key], { emitEvent: false, onlySelf: true }));
        this._value = this.reduceValue();
        if (options.emitEvent !== false) {
            this.valueChanges.emit(this._value);
        }
        this.updateValueAndValidity(options);
    }

    patchValue(value: Record<string, any>, options: UpdateOptions = { emitEvent: true }): void {
        Object.keys(this.controls).forEach(key => {
            if (value && key in value) {
                this.controls[key].setValue(value[key], { emitEvent: false, onlySelf: true });
            }
        });
        this._value = this.reduceValue();
        if (options.emitEvent !== false) {
            this.valueChanges.emit(this._value);
        }
        this.updateValueAndValidity(options);
    }

    override reset(value: Record<string, any> = {}, options: UpdateOptions = { emitEvent: true }): void {
        super.reset(value, options);
    }

    override markAllAsTouched(): void {
        this.markAsTouched();
        Object.values(this.controls).forEach(control => control.markAllAsTouched());
    }

    protected override runSyncValidators(): ValidationErrors {
        const childErrors = Object.keys(this.controls).reduce<Record<string, any>>((all, key) => {
            const errors = this.controls[key].errors;
            if (errors) all[key] = errors;
            return all;
        }, {});
        return this.mergeErrors(super.runSyncValidators(), Object.keys(childErrors).length ? childErrors : null);
    }

    protected reduceValue(): Record<string, any> {
        return Object.keys(this.controls).reduce<Record<string, any>>((value, key) => {
            value[key] = this.controls[key].value;
            return value;
        }, {});
    }
}

export class FormArray extends AbstractControl<any[]> {
    readonly controls: AbstractControl[];

    constructor(controls: AbstractControl[] = [], validators?: ValidatorFn | ValidatorFn[] | ControlOptions | null, asyncValidators?: AsyncValidatorFn | AsyncValidatorFn[] | null) {
        const options = isControlOptions(validators) ? validators : undefined;
        super(options?.validators ?? (validators as ValidatorFn | ValidatorFn[] | null), options?.asyncValidators ?? asyncValidators);
        this.controls = [...controls];
        this.controls.forEach(control => control.setParent(this));
        this._value = this.controls.map(control => control.value);
        this.updateValueAndValidity({ emitEvent: false });
    }

    override updateValueAndValidity(options: UpdateOptions = { emitEvent: true }): void {
        this._value = this.controls.map(control => control.value);
        super.updateValueAndValidity(options);
    }

    at(index: number): AbstractControl | null { return this.controls[index] || null; }
    push(control: AbstractControl): void { control.setParent(this); this.controls.push(control); this.updateValueAndValidity(); }
    removeAt(index: number): void { this.controls.splice(index, 1); this.updateValueAndValidity(); }
    clear(): void { this.controls.length = 0; this.updateValueAndValidity(); }

    setValue(value: any[], options: UpdateOptions = { emitEvent: true }): void {
        this.controls.forEach((control, index) => control.setValue(value?.[index], { emitEvent: false, onlySelf: true }));
        this._value = this.controls.map(control => control.value);
        if (options.emitEvent !== false) {
            this.valueChanges.emit(this._value);
        }
        this.updateValueAndValidity(options);
    }

    override markAllAsTouched(): void {
        this.markAsTouched();
        this.controls.forEach(control => control.markAllAsTouched());
    }

    protected override runSyncValidators(): ValidationErrors {
        const childErrors = this.controls.some(control => control.errors)
            ? { children: this.controls.map(control => control.errors) }
            : null;
        return this.mergeErrors(super.runSyncValidators(), childErrors);
    }
}

function isControlOptions(value: any): value is ControlOptions {
    return !!value && typeof value === 'object' && !Array.isArray(value) && ('validators' in value || 'asyncValidators' in value);
}
