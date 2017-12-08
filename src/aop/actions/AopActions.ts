
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

    /**
     * bind property pointcut.
     */
    bindPropertyPointcut = 'bindPropertyPointcut',
    /**
     * bind method pointcut for instance.
     */
    bindMethodPointcut = 'bindMethodPointcut',

    /**
     * before constructor advice action.
     */
    beforeConstructor = 'beforeConstructor',

    /**
     * after constructor advice action.
     */
    afterConstructor = 'afterConstructor'
}
