import {
    IIocContainer, IocCoreService, isArray,
    isInjectReference, isClassType, isToken, isClass,
    lang, Token, ClassType, isTypeObject, ParamProviders,
    InjectReference, ProviderMap, isRegistrationClass,
    isFunction
} from '@ts-ioc/ioc';
import { IRefServiceResolver } from '../IRefServiceResolver';
import {
    ReferenceToken, RefTarget, RefTagLevel,
    isRefTarget, RefTokenFacType, RefTokenType
} from '../types';

export class RefServiceResolver extends IocCoreService implements IRefServiceResolver {

    constructor(private container: IIocContainer) {
        super();
    }

    /**
    * get target reference service.
    *
    * @template T
    * @param {Type<Registration<T>>} [refToken] reference service Registration Injector
    * @param {RefTarget | RefTarget[]} target  the service reference to.
    * @param {Token<T>} [defaultToken] default service token.
    * @param {...ParamProviders[]} providers
    * @returns {T}
    * @memberof Container
    */
    getRefService<T>(refToken: ReferenceToken<T>, target: RefTarget | RefTarget[], defaultToken?: Token<T> | Token<any>[], ...providers: ParamProviders[]): T {
        let service: T = null;
        (isArray(target) ? target : [target])
            .some(tag => {
                this.forInRefTarget(tag, tk => {
                    // exclude ref registration.
                    if (isInjectReference(tk)) {
                        return true;
                    }
                    return !(isArray(refToken) ? refToken : [refToken]).some(stk => {
                        let tokens = this.getRefToken(stk, tk);
                        return (isArray(tokens) ? tokens : [tokens]).some(rtk => {
                            service = this.resolveRef(rtk, tk, ...providers);
                            return service !== null;
                        });
                    });
                });
                return service !== null;
            });

        if (!service && defaultToken) {
            service = this.resolveFirst(isArray(defaultToken) ? defaultToken : [defaultToken], ...providers);
        }
        return service;
    }


    /**
     * iterate token  in  token class chain.  return false will break iterate.
     *
     * @param {RefTarget} target
     * @param {(token: Token<any>) => boolean} express
     * @memberof Container
     */
    forInRefTarget(target: RefTarget, express: (token: Token<any>) => boolean): void {
        let type: ClassType<any>;
        let token: Token<any>;
        let level: RefTagLevel;
        if (isToken(target)) {
            token = target;
            level = RefTagLevel.all;
        } else if (target) {
            if (isRefTarget(target)) {
                token = target.target;
                level = target.level || RefTagLevel.self;
            } else if (isTypeObject(target)) {
                token = lang.getClass(target);
                level = RefTagLevel.all;
            }
        }

        if (!isToken(token)) {
            return;
        }

        if (isClassType(token)) {
            type = token;
            if (isClass(type) && !this.container.has(type)) {
                this.container.register(type);
            }
        } else {
            type = this.container.getTokenProvider(token);
        }
        if (!isClassType(token) || (RefTagLevel.self === level)) {
            express(token);
            return;
        }

        let inChain = (level & RefTagLevel.chain) > 0;
        let inProviders = (level & RefTagLevel.providers) > 0;
        lang.forInClassChain(type, ty => {
            let tokens: Token<any>[];
            if (inProviders) {
                let prdKey = new InjectClassProvidesToken(ty);
                let prds = this.get(prdKey);
                if (prds && prds.provides && prds.provides.length) {
                    let ppdkey = prdKey.toString();
                    let pmapKey = new InjectReference(ProviderMap, ty).toString();
                    tokens = prds.provides.slice(1).filter(p => {
                        let key = this.container.getTokenKey(p);
                        return key !== ppdkey && key !== pmapKey
                    });
                }
            }
            tokens = tokens || [];
            return !(tokens.concat(ty).some(tk => express(tk) === false)) && inChain;
        });
    }

    /**
 * resolve first token when not null.
 *
 * @template T
 * @param {Token<T>[]} tokens
 * @param {...ParamProviders[]} providers
 * @returns {T}
 * @memberof IContainer
 */
    resolveFirst<T>(tokens: Token<T>[], ...providers: ParamProviders[]): T {
        let inst: T;
        tokens.some(tk => {
            inst = this.container.resolve(tk, ...providers);
            return inst !== null;
        })
        return inst;
    }

    /**
     * get token implement class and base classes.
     *
     * @param {Token<any>} token
     * @returns {Token<any>[]}
     * @memberof Container
     */
    getTokenClassChain(token: Token<any>, chain = true): Token<any>[] {
        let tokens: Token<any>[] = [];
        this.forInRefTarget(token, tk => {
            tokens.push(tk);
            return chain;
        });
        return tokens;
    }

    protected getRefToken<T>(ref: RefTokenFacType<T>, tk: Token<any>): RefTokenType<T> | RefTokenType<T>[] {
        if (isRegistrationClass(ref)) {
            return new ref(tk);
        }
        if (isToken(ref)) {
            return ref;
        }
        if (isFunction(ref)) {
            return ref(tk);
        }
        return ref;
    }

    protected resolveRef<T>(refToken: RefTokenType<T>, target: Token<any>, ...providers: ParamProviders[]): T {
        let tk: Token<T>;
        let isPrivate = false;
        if (isToken(refToken)) {
            tk = refToken;
        } else {
            tk = refToken.service;
            isPrivate = refToken.isPrivate !== false;
        }

        if (!tk) {
            return null;
        }
        // resolve private first.
        if (isClass(target) && !isInjectReference(tk)) {
            let pdrmap = this.container.resolve(new InjectReference(ProviderMap, target));
            if (pdrmap && pdrmap.has(tk)) {
                return pdrmap.resolve(tk, ...providers);
            }
        }
        // have not private registered.
        if (isPrivate) {
            return null;
        }
        return this.container.resolve(tk, ...providers);
    }

}