/**
 * decorator action type
 *
 * @export
 * @enum {number}
 */
export enum ActionType {
    /**
     * set param type form metadata.
     */
    setParamType = 'setParamType',
    /**
     * set Property type from metadata.
     */
    setPropType = 'setPropType',

    /**
     * class provider bind action.
     */
    provider = 'provider',
    /**
     * Aspect
     */
    aspect = 'aspect',

    /**
     * access method.
     */
    accessMethod = 'accessMethod',

    /**
     * bind instance, for custom extensions.
     */
    bindInstance = 'bindInstance',
    /**
     * bind instance method, for custom extensions.
     */
    bindMethod = 'bindMethod'

}
