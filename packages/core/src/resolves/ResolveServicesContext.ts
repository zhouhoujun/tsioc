import { ClassType, ProviderMap, Token, createRaiseContext, ContainerFactory } from '@tsdi/ioc';
import { ServiceOption, ResolveServiceContext } from './ResolveServiceContext';

/**
 * services context options
 *
 * @export
 * @interface ServicesOption
 * @extends {ServiceOption}
 */
export interface ServicesOption<T> extends ServiceOption<T> {
    /**
     * get services both in container and target private refrence service.
     *
     * @type {boolean}
     * @memberof ServicesActionOption
     */
    both?: boolean;
    /**
     * class type.
     *
     * @type {ClassType[]}
     * @memberof ServicesActionOption
     */
    types?: ClassType[];
}

/**
 * resolve services context.
 *
 * @export
 * @class ResolveServicesContext
 * @extends {ResolveServiceContext}
 */
export class ResolveServicesContext<T = any> extends ResolveServiceContext<T> {
    constructor(token?: Token<T>) {
        super(token)
    }
    /**
     * parse service resolve context.
     *
     * @static
     * @param {ServicesOption} [options]
     * @returns {ResolveServicesContext}
     * @memberof ResolveServicesContext
     */
    static parse<T>(target?: Token<T> | ServicesOption<T>, raiseContainer?: ContainerFactory): ResolveServicesContext<T> {
        return createRaiseContext<ResolveServicesContext>(ResolveServicesContext, target, raiseContainer);
    }

    /**
     * get services both in container and target private refrence service.
     *
     * @type {boolean}
     * @memberof ResolveServicesContext
     */
    both?: boolean;

    types?: ClassType[];

    /**
     * all matched services map.
     *
     * @type {ProviderMap}
     * @memberof ResolveServicesContext
     */
    services?: ProviderMap;

    setOptions(options: ServicesOption<T>) {
        if (!options) {
            return;
        }
        super.setOptions(options);
        if (options.both) {
            this.both = options.both;
        }
        if (options.types) {
            this.types = options.types;
        }
    }

}
