import { TypeFactory, StepWork } from '../TypeFactory';
import { LifeScope } from '../LifeScope';
import { NonePointcut } from './decorators/index';


@NonePointcut()
export class DefaultTypeFactory implements TypeFactory {

    steps: StepWork<any>[];
    constructor() {

    }

    step<T>(work: StepWork<T>): TypeFactory {
        this.steps.push(work);
        return this;
    }

}
