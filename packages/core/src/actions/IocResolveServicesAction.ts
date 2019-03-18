import { Abstract, IocResolveAction, ClassType, ProviderMap } from '@ts-ioc/ioc';
import { ServiceActionOption, ResolveServiceContext } from './ResolveServiceContext';


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
export class ResolveServicesContext  extends ResolveServiceContext {

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


@Abstract()
export abstract class IocResolveServicesAction extends IocResolveAction {
    abstract execute(ctx: ResolveServicesContext, next: () => void): void;
}