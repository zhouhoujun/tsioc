# @tsdi/components/forms

Reactive form controls, groups, arrays and validators for `@tsdi/components`.

```ts
const form = new FormGroup({
  email: new FormControl('', [Validators.required, Validators.email]),
  password: new FormControl('', Validators.minLength(8))
});
```

- `valueChanges` / `statusChanges` emit when values or validation state change.
- `Validators` includes required, requiredTrue, email, minLength, maxLength, pattern, min, max, compose and composeAsync.
- `FormBuilder` builds controls/groups/arrays.
- `[formControl]` binds a control to an input, including `aria-invalid` and `is-invalid`.
