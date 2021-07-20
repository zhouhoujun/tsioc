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
    name: string;
    /**
     * full name of property or method
     *
     * @type {string}
     */
    fullName: string;

    /**
     * method
     *
     * @type {(TypedPropertyDescriptor<any> | PropertyDescriptor)}
     */
    descriptor?: TypedPropertyDescriptor<any> | PropertyDescriptor;
}
