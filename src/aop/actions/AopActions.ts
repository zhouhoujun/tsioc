
/**
 * aop actions.
 *
 * @export
 * @enum {number}
 */
export enum AopActions {

    /**
     * register aspect service.
     */
    registAspect = 'registAspect',

    matchPointcut = 'matchPointcut',
    /**
     * bind property pointcut.
     */
    bindPropertyPointcut = 'bindPropertyPointcut',
    /**
     * bind method pointcut for instance.
     */
    bindMethodPointcut = 'bindMethodPointcut',

    invokeBeforeConstructorAdvices = 'invokeBeforeConstructorAdvices',

    invokeAfterConstructorAdvices = 'invokeAfterConstructorAdvices'

}
