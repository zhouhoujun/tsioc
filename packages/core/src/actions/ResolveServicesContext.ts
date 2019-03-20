import { ClassType, ProviderMap, IResolverContainer } from '@ts-ioc/ioc';
import { ServiceActionOption, ResolveServiceContext } from './ResolveServiceContext';
import { IContainer } from '../IContainer';

/**
 * services action options
 *
 * @export
 * @interface ServicesActionOption
 * @extends {ServiceActionOption}
 */
export interface ServicesActionOption extends ServiceActionOption {
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
export class ResolveServicesContext extends ResolveServiceContext {

    /**
     * parse service resolve context.
     *
     * @static
     * @param {ServicesActionOption} [options]
     * @param {(IContainer | (() => IContainer))} [raiseContainerGetter]
     * @param {(IResolverContainer | (() => IResolverContainer))} [providersGetter]
     * @returns {ResolveServicesContext}
     * @memberof ResolveServicesContext
     */
    static parse(options?: ServicesActionOption, raiseContainerGetter?: IContainer | (() => IContainer), providersGetter?: IResolverContainer | (() => IResolverContainer)): ResolveServicesContext {
        let ctx = new ResolveServicesContext();
        if (options) {
            Object.assign(ctx, options);
        }
        if (raiseContainerGetter) {
            ctx.setRaiseContainer(raiseContainerGetter);
        }
        if (providersGetter) {
            ctx.setProviderContainer(providersGetter);
        }
        return ctx;
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

    /**
     * set options.
     *
     * @param {ServicesActionOption} options
     * @memberof ResolveServiceContext
     */
    setOptions(options: ServicesActionOption) {
        super.setOptions(options);
    }

}
