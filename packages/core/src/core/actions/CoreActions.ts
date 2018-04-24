/**
 * cores decorator actions
 *
 * @export
 */
export enum CoreActions {

    /**
     * the action bind parameter type form metadata.
     */
    bindParameterType = 'bindParameterType',

    /**
     * the action bind Property type from metadata.
     */
    bindPropertyType = 'bindPropertyType',

    /**
     * inject property action.
     */
    injectProperty = 'injectProperty',

    /**
     * class provider bind action.
     */
    bindProvider = 'bindProvider',

    /**
     * bind parameter provider action.
     */
    bindParameterProviders = 'bindParameterProviders',


    /**
     * cache action.
     */
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
     * component after init hooks. after component init.
     */
    componentAfterInit = 'componentAfterInit',

    /**
     * singleton action.
     */
    singletion = 'singletion',


    /**
     * autorun action.
     */
    autorun = 'autorun'

}
