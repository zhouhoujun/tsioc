
/**
 * life state.
 *
 * @export
 * @enum {number}
 */
export enum LifeState {

    /**
     * before create constructor Args
     */
    beforeCreateArgs = 'beforeCreateArgs',

    /**
     * before constructor advice action.
     */
    beforeConstructor = 'beforeConstructor',

    /**
     * after constructor advice action.
     */
    afterConstructor = 'afterConstructor',

    /**
     * on init.
     */
    onInit = 'onInit',

    /**
     * after init.
     */
    AfterInit = 'AfterInit'
}
