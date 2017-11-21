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
    bindInstance = 'bindInstance',
    bindMethod = 'bindMethod'
}
