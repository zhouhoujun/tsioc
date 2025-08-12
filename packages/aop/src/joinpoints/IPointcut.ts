import { AbstractType } from '@tsdi/ioc';

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
     */
    name: string|symbol;
    /**
     * full name of property or method
     *
     * @type {string}
     */
    fullName: string;

    accessor?: 'get' | 'set' | 'value';

    type?: AbstractType;

}
