/**
 * cores decorator actions
 *
 * @export
 */
export enum CoreActions {

    /**
     * before constructor advice action.
     */
    beforeConstructor = 'beforeConstructor',

    /**
     * after constructor advice action.
     */
    afterConstructor = 'afterConstructor',

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


    componentCache = 'componentCache',
    /**
     * component init action.  after constructor befor property inject.
     */
    componentBeforeInit = 'componentBeforeInit',


    /**
     * component on init hooks. after property inject.
     */
    componentInit = 'componentInit',

    /**
     * component after init.
     */
    componentAfterInit = 'componentAfterInit'

}
