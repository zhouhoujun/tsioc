import { InjectableMetadata, PropertyMetadata, Type } from '@tsdi/ioc';

/**
 * component metadata.
 *
 * @export
 * @interface DirectiveMetadata
 * @extends {InjectableMetadata}
 */
export interface DirectiveMetadata extends InjectableMetadata {
    /**
     * decotactor selector.
     *
     * @type {string}
     * @memberof DirectiveMetadata
     */
    selector?: string;
}


/**
 * component metadata.
 *
 * @export
 * @interface ComponentMetadata
 * @extends {DirectiveMetadata}
 */
export interface ComponentMetadata extends DirectiveMetadata {
    /**
     * component selector.
     *
     * @type {string}
     * @memberof ComponentMetadata
     */
    selector?: string;
    /**
     * template for component.
     *
     * @type {*}
     * @memberof ComponentMetadata
     */
    template?: any;

    templateUrl?: string;
}


/**
 * binding property metadata.
 *
 * @export
 * @interface BindingMetadata
 * @extends {ParamPropMetadata}
 */
export interface BindingMetadata {
    type?: Type;
    /**
     * binding name.
     *
     * @type {string}
     * @memberof BindingMetadata
     */
    bindingPropertyName?: string;
    /**
     * default value.
     *
     * @type {*}
     * @memberof BindingMetadata
     */
    defaultValue?: any;
}

/**
 * query metadata.
 */
export interface QueryMetadata {
    type?: Type;
    descendants: boolean;
    first: boolean;
    read: any;
    isViewQuery: boolean;
    selector: any;
    static?: boolean;
}


/**
 * HostBinding metadata.
 *
 */
export interface HostBindingMetadata {
    type?: Type;
    /**
     * host property name.
     *
     * @type {string}
     * @memberof HostBindingMetadata
     */
    hostPropertyName?: string;
}


/**
 * HostListener metadata.
 *
 */
export interface HostListenerMetadata {
    type?: Type;
    /**
     * event name.
     *
     * @type {string}
     * @memberof HostListenerMetadata
     */
    eventName?: string;
    /**
     * default value.
     *
     * @type {*}
     * @memberof HostListenerMetadata
     */
    args?: string[];
    
}


/**
 * vaildate property metadata.
 */
export interface VaildateMetadata extends PropertyMetadata {
    required?: boolean;
    vaild?: (value: any, target?: any) => boolean | Promise<boolean>;
    errorMsg?: string;
}
