import { createContext, IInjector, ClassType } from '@tsdi/ioc';
import { ServiceOption, ServiceContext } from './ServiceContext';
import { CTX_TYPES } from '../context-tokens';

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
}

/**
 * resolve services context.
 */
export class ServicesContext<T = any> extends ServiceContext<T, ServicesOption<T>> {
    /**
     * parse service resolve context.
     *
     * @static
     * @param { IInjector } injecor
     * @param {ServicesOption<T>} target
     * @returns {ServicesContext}
     * @memberof ResolveServicesContext
     */
    static parse<T>(injecor: IInjector, options: ServicesOption<T>): ServicesContext<T> {
        return createContext<ServicesContext>(injecor, ServicesContext, options);
    }

    get types(): ClassType[] {
        return this.getValue(CTX_TYPES) ?? this.getTypes();
    }

    protected getTypes() {
        let types = this.tokens.map(t => this.injector.getTokenProvider(t))
            .filter(t => t);
        this.setValue(CTX_TYPES, types);
        return types;
    }

    /**
     * all matched services map.
     *
     * @type {Injector}
     * @memberof ResolveServicesContext
     */
    services?: IInjector;

}
