import { Token, ResolveActionContext, ResolveActionOption, createRaiseContext, IInjector, isArray } from '@tsdi/ioc';
import { CTX_TOKENS, CTX_TARGET_REFS } from '../../context-tokens';

/**
 * service context option.
 *
 * @export
 * @interface ServiceOption
 * @extends {ResovleActionOption}
 */
export interface ServiceOption<T> extends ResolveActionOption<T> {
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
export class ResolveServiceContext<T = any, TOP extends ServiceOption<T> = ServiceOption<T>> extends ResolveActionContext<T, TOP> {
    /**
     * create resolve context via options.
     *
     * @static
     * @param { IInjector } injecor
     * @param {ServiceOption<T>} options
     * @returns {ResolveActionContext}
     * @memberof ResolveActionContext
     */
    static parse<T>(injecor: IInjector, options: ServiceOption<T>): ResolveServiceContext<T> {
        return createRaiseContext<ResolveServiceContext>(injecor, ResolveServiceContext, options);
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
            return;
        }
        super.setOptions(options);
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
    }

}
