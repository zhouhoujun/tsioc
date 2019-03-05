import {
    ParamProviders, Token, isArray, isToken, isTypeObject,
    isClass, isBoolean, isFunction, InjectReference, IocCoreService
} from '@ts-ioc/ioc';
import { IServiceResolver } from '../IServiceResolver';
import { RefTarget, isRefTarget, RefTokenFac } from '../types';
import { IContainer } from '../IContainer';
import { RefServiceResolver } from './RefServiceResolver';


/**
 * service resolver
 *
 * @export
 * @class ServiceResolver
 */
export class ServiceResolver extends IocCoreService implements IServiceResolver {

    constructor(private container: IContainer) {
        super();
    }

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | Token<any>[])} token servive token.
     * @param {(RefTarget | RefTarget[])} [target] service refrence target.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof Container
     */
    getService<T>(token: Token<T> | Token<any>[], target?: RefTarget | RefTarget[] | ParamProviders, toRefToken?: boolean | Token<T> | RefTokenFac<T> | ParamProviders, defaultToken?: boolean | Token<T> | ParamProviders, ...providers: ParamProviders[]): T {
        if (isArray(target) || isToken(target) || isRefTarget(target) || isTypeObject(target)) {
            let tokens: Token<any>[] = [];
            (isArray(token) ? token : [token]).forEach(tk => {
                tokens.push(tk);
                if (!isClass(tk)) {
                    tokens.push(this.container.getTokenImpl(tk));
                }
            });

            let fac: RefTokenFac<T>;
            let defToken: Token<T> | Token<any>[];
            let prds: ParamProviders[] = [];
            if (isBoolean(toRefToken)) {
                if (toRefToken) {
                    defToken = token;
                } else {
                    defToken = null;
                }
            } else if (isToken(toRefToken)) {
                defToken = toRefToken;
            } else if (isFunction(toRefToken)) {
                fac = toRefToken;
                if (isBoolean(defaultToken)) {
                    if (defaultToken) {
                        defToken = token;
                    } else {
                        defToken = null;
                    }
                } else if (isToken(defaultToken)) {
                    defToken = defaultToken;
                } else if (defaultToken) {
                    prds.push(defaultToken);
                }
            } else if (toRefToken) {
                prds.unshift(toRefToken);
            }


            defToken = defToken === null ? null : (defToken || token);
            prds = prds.concat(providers);
            return this.container.resolve(RefServiceResolver).getRefService(
                [
                    ...tokens.map(tk => { return { service: tk, isPrivate: true } }),
                    ...fac ? [tk => fac(tk)] : [],
                    ...tokens.map(t => (tk) => new InjectReference(t, tk))
                ],
                target as RefTarget | RefTarget[],
                defToken,
                ...prds);
        } else {
            return this.container.resolve(RefServiceResolver).resolveFirst(isArray(token) ? token : [token], ...[target, toRefToken as ParamProviders, defaultToken as ParamProviders, ...providers].filter(a => a));
        }
    }

}
