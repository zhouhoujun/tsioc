/**
 * cores decorator actions
 *
 * @export
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
     * inject property.
     */
    injectProperty = 'injectProperty',

    /**
     * class provider bind action.
     */
    bindProvider = 'bindProvider',

    /**
     * access method.
     */
    bindParameterProviders = 'bindParameterProviders',


    cache = 'cache',

    /**
     * component init action.  after constructor befor property inject.
     */
    componentBeforeInit = 'componentBeforeInit',

    /**
     * component on init hooks. after property inject.
     */
    componentInit = 'componentInit',

    /**
     * singleton action.
     */
    singletion = 'singletion'



}
