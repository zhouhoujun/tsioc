
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
     * @memberof MatchAdvice
     */
    name: string;
    /**
     * full name of property or method
     *
     * @type {string}
     * @memberof MatchAdvice
     */
    fullName: string;

}
