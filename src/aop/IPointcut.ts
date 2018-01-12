import { IParameter } from '../IParameter';
import { MethodMetadata } from '../core/index';

/**
 * pointcut.
 *
 * @export
 * @interface Pointcut
 */
export interface IPointcut {
    /**
     * property or method name.
     *
     * @type {string}
     * @memberof IPointcut
     */
    name: string;
    /**
     * full name of property or method
     *
     * @type {string}
     * @memberof IPointcut
     */
    fullName: string;

    /**
     * annotation metadatas.
     *
     * @type {any[]}
     * @memberof IPointcut
     */
    annotation?: MethodMetadata[];

    /**
     * method
     *
     * @type {(TypedPropertyDescriptor<any> | PropertyDescriptor)}
     * @memberof IPointcut
     */
    descriptor?: TypedPropertyDescriptor<any> | PropertyDescriptor;
}
