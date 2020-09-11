import { Token, ResolveContext, ResolveOption, createContext, IInjector, isArray, ClassType, Type } from '@tsdi/ioc';
import { CTX_TOKENS, CTX_TARGET_REFS, CTX_ALIAS, CTX_TYPES } from '../tk';

/**
 * service context option.
 *
 * @export
 * @interface ServiceOption
 * @extends {ResovleActionOption}
 */
export interface ServiceOption<T> extends ResolveOption<T> {
    /**
     * token provider service type.
     *
     * @type {Type}
     * @memberof ServiceActionOption
     */
    tokens?: Token<T>[];

    /**
     * token alias.
     *
     * @type {string}
     * @memberof ServiceOption
     */
    alias?: string;
    /**
     * get extend servie or not.
     *
     * @type {boolean}
     * @memberof ServiceOption
     */
    extend?: boolean;
}

/**
 * service resolve context.
 *
 * @export
 * @class ResolveServiceContext
 * @extends {ResovleActionContext}
 */
export class ServiceContext<T = any, TOP extends ServiceOption<T> = ServiceOption<T>> extends ResolveContext<T, TOP> {
    /**
     * create resolve context via options.
     *
     * @static
     * @param { IInjector } injecor
     * @param {ServiceOption<T>} options
     * @returns {ResolveContext}
     * @memberof ResolveActionContext
     */
    static parse<T>(injecor: IInjector, options: ServiceOption<T>): ServiceContext<T> {
        return createContext<ServiceContext>(injecor, ServiceContext, options);
    }

    /**
     * service tokens.
     *
     * @type {Type}
     * @memberof ResolveServiceContext
     */
    get tokens(): Token<T>[] {
        return this.getValue(CTX_TOKENS);
    }

    get alias(): string {
        return this.getValue(CTX_ALIAS);
    }

    setOptions(options: TOP) {
        if (!options) {
            return this;
        }
        let tokens = this.getValue(CTX_TOKENS) || [];
        let alias = options.alias;
        if (options.token) {
            tokens.push(this.context.getToken(options.token, alias));
        }
        if (options.tokens && options.tokens.length) {
            options.tokens.forEach(t => {
                t && tokens.push(this.context.getToken(t, alias));
            });
        }
        if (options.alias) {
            this.context.setValue(CTX_ALIAS, options.alias);
        }
        if (options.target) {
            let targets = (isArray(options.target) ? options.target : [options.target]).filter(t => t);
            if (targets.length) {
                this.context.setValue(CTX_TARGET_REFS, targets);
            }
        }
        this.context.setValue(CTX_TOKENS, tokens);
        return super.setOptions(options);
    }

}


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

    protected getTypes(): Type<T>[] {
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
