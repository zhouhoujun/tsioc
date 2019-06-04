import { ClassType, ProviderMap, Token, IIocContainer, createResolveContext } from '@tsdi/ioc';
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
     * @type {ClassType<any>[]}
     * @memberof ServicesActionOption
     */
    types?: ClassType<any>[];
}

/**
 * resolve services context.
 *
 * @export
 * @class ResolveServicesContext
 * @extends {ResolveServiceContext}
 */
export class ResolveServicesContext<T> extends ResolveServiceContext<T> {

    /**
     * parse service resolve context.
     *
     * @static
     * @param {ServicesOption} [options]
     * @param {(IContainer | (() => IContainer))} [raiseContainer]
     * @returns {ResolveServicesContext}
     * @memberof ResolveServicesContext
     */
    static parse<T>(target?: Token<T> | ServicesOption<T>, raiseContainer?: IIocContainer | (() => IIocContainer)): ResolveServicesContext<T> {
        return createResolveContext<T, ResolveServicesContext<T>>(ResolveServicesContext, target, raiseContainer);
    }

    /**
     * get services both in container and target private refrence service.
     *
     * @type {boolean}
     * @memberof ResolveServicesContext
     */
    both?: boolean;

    types?: ClassType<any>[];

    /**
     * all matched services map.
     *
     * @type {ProviderMap}
     * @memberof ResolveServicesContext
     */
    services?: ProviderMap;

}
