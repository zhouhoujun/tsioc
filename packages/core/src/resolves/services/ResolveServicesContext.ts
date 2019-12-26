import { ClassType, createRaiseContext, IInjector, ResolveActionContext } from '@tsdi/ioc';

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
export class ResolveServicesContext<T = any> extends ResolveActionContext<T, ServicesOption<T>> {
    /**
     * parse service resolve context.
     *
     * @static
     * @param { IInjector } injecor
     * @param {ServicesOption<T>} target
     * @returns {ResolveServicesContext}
     * @memberof ResolveServicesContext
     */
    static parse<T>(injecor: IInjector, options: ServicesOption<T>): ResolveServicesContext<T> {
        return createRaiseContext<ResolveServicesContext>(injecor, ResolveServicesContext, options);
    }

    get types(): ClassType[] {
        return this.getOptions().types;
    }

    /**
     * all matched services map.
     *
     * @type {Injector}
     * @memberof ResolveServicesContext
     */
    services?: IInjector;

}
