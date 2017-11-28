/**
 * decorator action type
 *
 * @export
 * @enum {number}
 */
export enum ActionType {
    resetParamType = 'resetParamType',
    resetPropType = 'resetPropType',
    injectProp = 'injectProp',
    provider = 'provider',
    /**
     * runner
     */
    runner = 'runner',
    /**
     * Aspect
     */
    aspect = 'aspect',
    bindInstance = 'bindInstance',
    bindMethod = 'bindMethod',

    accessMethod = 'accessMethod'
}
