import { Type, ClassMetadata, ClassType } from '@tsdi/ioc';

/**
 * aspect metadata.
 */
export interface AspectMetadata extends ClassMetadata {
    /**
     * set pointcut in the type only.
     *
     * @type {(ClassType<any> | ClassType<any>[])}
     * @memberof AspectMetadata
     */
    within?: ClassType<any> | ClassType<any>[];

    without?: ClassType<any> | ClassType<any>[];

    /**
     * set pointcut in the class with the annotation decorator only.
     *
     * @type {string}
     * @memberof AspectMetadata
     */
    annotation?: string | Function;

}
