import { Type, ClassMetadata } from '@ts-ioc/core';

export interface AspectMetadata extends ClassMetadata {
    /**
     * set pointcut in the type only.
     *
     * @type {(Type<any> | Type<any>[])}
     * @memberof AspectMetadata
     */
    within?: Type<any> | Type<any>[];

    /**
     * set pointcut in the class with the annotation decorator only.
     *
     * @type {string}
     * @memberof AspectMetadata
     */
    annotation?: string | Function;

}
