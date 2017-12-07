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
    bindParameterType = 'bindParameterType',
    /**
     * set Property type from metadata.
     */
    bindPropertyType = 'bindPropertyType',

    /**
     * class provider bind action.
     */
    bindProvider = 'bindProvider',
    /**
     * Aspect
     */
    aspect = 'aspect',

    /**
     * access method.
     */
    bindParameterProviders = 'bindParameterProviders',

    /**
     * bind instance, for custom extensions.
     */
    bindInstance = 'bindInstance',
    /**
     * bind instance method, for custom extensions.
     */
    bindMethod = 'bindMethod'

}
