import { ActionComponent } from './core';
import { LifeScope } from './LifeScope';
import { Type } from './Type';


/**
 * step work.
 *
 * @export
 * @interface StepWork
 * @template T
 */
export interface StepWork<T> {
    (type: Type<T>, instance?: T): void
}


export interface TypeFactory {
    /**
     * instance create step work
     *
     * @template T
     * @param {StepWork<T>} work step work
     * @returns {TypeFactory}
     * @memberof TypeFactory
     */
    step<T>(work: StepWork<T>): TypeFactory;
}
