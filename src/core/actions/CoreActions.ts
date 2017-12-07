/**
 * cores decorator actions
 *
 * @export
 * @enum {number}
 */
export enum CoreActions {
    /**
     * set param type form metadata.
     */
    bindParameterType = 'bindParameterType',
    /**
     * set Property type from metadata.
     */
    bindPropertyType = 'bindPropertyType',

    /**
     * set Property value from metadata.
     */
    bindProperty = 'bindProperty',

    /**
     * class provider bind action.
     */
    bindProvider = 'bindProvider',

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
