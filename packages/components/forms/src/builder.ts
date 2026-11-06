import { Injectable } from '@tsdi/ioc';
import { AsyncValidatorFn, ValidatorFn } from './validators';
import { ControlOptions, FormArray, FormControl, FormGroup } from './control';

type ValidatorInput = ValidatorFn | ValidatorFn[] | ControlOptions | null | undefined;

@Injectable()
export class FormBuilder {
    control<T = any>(value: T | null = null, validators?: ValidatorInput, asyncValidators?: AsyncValidatorFn | AsyncValidatorFn[] | null): FormControl<T> {
        return new FormControl<T>(value, validators, asyncValidators);
    }

    group(controls: Record<string, any>, validators?: ValidatorFn | ValidatorFn[] | ControlOptions | null, asyncValidators?: AsyncValidatorFn | AsyncValidatorFn[] | null): FormGroup {
        const built: Record<string, any> = {};
        Object.keys(controls).forEach(key => {
            const config = controls[key];
            built[key] = Array.isArray(config)
                ? this.control(config[0], config[1], config[2])
                : config instanceof FormControl || config instanceof FormGroup || config instanceof FormArray
                    ? config
                    : this.control(config);
        });
        return new FormGroup(built, validators, asyncValidators);
    }

    array(controls: any[], validators?: ValidatorFn | ValidatorFn[] | ControlOptions | null, asyncValidators?: AsyncValidatorFn | AsyncValidatorFn[] | null): FormArray {
        const built = controls.map(config => Array.isArray(config)
            ? this.control(config[0], config[1], config[2])
            : config);
        return new FormArray(built, validators, asyncValidators);
    }
}
