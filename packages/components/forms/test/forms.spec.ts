import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { FormBuilder, FormControl, FormGroup, Validators } from '../src';

@Suite('reactive forms')
export class ReactiveFormsTest {
    @Test('validators expose required, email, length and range errors')
    validators() {
        const required = new FormControl('', Validators.required);
        expect(required.valid).toEqual(false);
        expect(required.errors).toEqual({ required: true });
        required.setValue('x');
        expect(required.valid).toEqual(true);

        const email = new FormControl('nope', Validators.email);
        expect(email.errors).toEqual({ email: true });
        email.setValue('a@b.co');
        expect(email.valid).toEqual(true);

        const length = new FormControl('ab', [Validators.minLength(3), Validators.maxLength(4)]);
        expect(length.errors?.minlength).toEqual({ requiredLength: 3, actualLength: 2 });
        length.setValue('abcdef');
        expect(length.errors?.maxlength).toEqual({ requiredLength: 4, actualLength: 6 });

        const range = new FormControl(5, [Validators.min(1), Validators.max(3)]);
        expect(range.errors?.max).toEqual({ max: 3, actual: 5 });
        range.setValue(2);
        expect(range.valid).toEqual(true);
    }

    @Test('groups aggregate values, errors and touched state')
    groups() {
        const group = new FormGroup({
            name: new FormControl('', Validators.required),
            age: new FormControl(20, Validators.min(18))
        });
        expect(group.value).toEqual({ name: '', age: 20 });
        expect(group.invalid).toEqual(true);
        expect(group.errors?.name).toEqual({ required: true });
        group.controls.age.setValue(12);
        expect(group.errors?.age).toEqual({ min: { min: 18, actual: 12 } });
        group.patchValue({ name: 'Ada', age: 30 });
        expect(group.valid).toEqual(true);
        group.markAllAsTouched();
        expect(group.controls.name.touched).toEqual(true);
    }

    @Test('arrays track child values and validity')
    arrays() {
        const array = new FormBuilder().array([['one', Validators.required], ['two']]);
        expect(array.value).toEqual(['one', 'two']);
        array.at(0)?.setValue('');
        expect(array.invalid).toEqual(true);
        array.at(0)?.setValue('three');
        expect(array.valid).toEqual(true);
        array.push(new FormControl('four'));
        expect(array.value).toEqual(['three', 'two', 'four']);
        array.removeAt(1);
        expect(array.value).toEqual(['three', 'four']);
    }

    @Test('async validators move through PENDING to VALID or INVALID')
    async asyncValidators() {
        const control = new FormControl('taken', null, async c => c.value === 'free' ? null : { unique: true });
        expect(control.status).toEqual('PENDING');
        await Promise.resolve();
        await Promise.resolve();
        expect(control.invalid).toEqual(true);
        expect(control.errors?.unique).toBe(true);
        control.setValue('free');
        expect(control.status).toEqual('PENDING');
        await Promise.resolve();
        await Promise.resolve();
        expect(control.valid).toEqual(true);
    }

    @Test('form builder builds grouped controls and emits value changes')
    builder() {
        const builder = new FormBuilder();
        const group = builder.group({
            email: ['', [Validators.required, Validators.email]],
            age: [20]
        });
        let latest: any;
        group.valueChanges.subscribe(value => { latest = value; });
        group.patchValue({ email: 'user@example.com' });
        expect(latest).toEqual({ email: 'user@example.com', age: 20 });
        expect(group.valid).toEqual(true);
    }
}
