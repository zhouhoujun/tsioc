import { Token, ResolveContext, ResolveOption, createContext, IInjector, isArray } from '@tsdi/ioc';
import { CTX_TOKENS, CTX_TARGET_REFS } from '../context-tokens';

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

    setOptions(options: TOP) {
        if (!options) {
            return this;
        }
        let tokens = this.getValue(CTX_TOKENS) || [];
        if (options.token) {
            tokens.push(options.token)
        }
        if (options.tokens && options.tokens.length) {
            options.tokens.forEach(t => {
                t && tokens.push(t);
            });
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
