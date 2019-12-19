import 'reflect-metadata';
import { IIocContainer, ContainerFactoryToken, ContainerFactory } from './IIocContainer';
import { Type, Token, Factory, SymbolType, ToInstance } from './types';
import { isClass, isFunction, isSymbol, isString, isDefined } from './utils/lang';
import { Registration } from './Registration';
import { registerCores } from './registerCores';
import { ParamProviders } from './providers/types';
import { TypeReflects } from './services/TypeReflects';
import { IocSingletonManager } from './actions/IocSingletonManager';
import { RuntimeActionContext } from './actions/runtime/RuntimeActionContext';
import { RuntimeLifeScope } from './actions/RuntimeLifeScope';
import { DesignActionContext } from './actions/design/DesignActionContext';
import { DesignLifeScope } from './actions/DesignLifeScope';
import { IInjector } from './IInjector';
import { BaseInjector } from './BaseInjector';
import { ActionInjectorToken, IActionInjector } from './actions/Action';


const factoryToken = ContainerFactoryToken.toString();
const actionInjectorKey = ActionInjectorToken.toString();
/**
 * Container
 *
 * @export
 * @class IocContainer
 * @implements {IIocContainer}
 */
export class IocContainer extends BaseInjector implements IIocContainer {
    constructor() {
        super();
        this.init();
    }

    get size(): number {
        return this.factories.size;
    }

    getTypeReflects(): TypeReflects {
        return this.getInstance(TypeReflects);
    }

    /**
     * get injector
     * @param type
     */
    getInjector(type: Type): IInjector {
        return this.getTypeReflects().getInjector(type);
    }

    getFactory<T extends IIocContainer>(): ContainerFactory<T> {
        return this.getInstance(factoryToken) as ContainerFactory<T>;
    }

    /**
     * register type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {T} [fac]
     * @returns {this}
     * @memberOf Container
     */
    register<T>(token: Token<T>, fac?: Factory<T>): this {
        this.registerFactory(this, token, fac);
        return this;
    }

    /**
     * register stingleton type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} [fac]
     * @returns {this}
     * @memberOf Container
     */
    registerSingleton<T>(token: Token<T>, fac?: Factory<T>): this {
        this.registerFactory(this, token, fac, true);
        return this;
    }

    protected init() {
        super.init();
        registerCores(this);
    }

    registerFactory<T>(injector: IInjector, token: Token<T>, value?: Factory<T>, singleton?: boolean): this {
        (async () => {
            let key = injector.getTokenKey(token);
            // if (injector.hasTokenKey(key)) {
            //     return;
            // }
            let classFactory;
            if (isDefined(value)) {
                if (isFunction(value)) {
                    if (isClass(value)) {
                        this.injectType(injector, value, singleton, key);
                    } else {
                        classFactory = this.createCustomFactory(injector, key, value as ToInstance<T>, singleton);
                    }
                } else if (singleton && value !== undefined) {
                    classFactory = this.createCustomFactory(injector, key, () => value, singleton);
                }

            } else if (!isString(token) && !isSymbol(token)) {
                let ClassT = (token instanceof Registration) ? token.getClass() : token;
                if (isClass(ClassT)) {
                    this.injectType(injector, ClassT, singleton, key);
                }
            }

            if (classFactory) {
                injector.set(key, classFactory);
            }
        })();
        return this;
    }

    protected createCustomFactory<T>(injector: IInjector, key: SymbolType<T>, factory?: ToInstance<T>, singleton?: boolean) {
        return singleton ?
            (...providers: ParamProviders[]) => {
                let mgr = injector.getInstance(IocSingletonManager);
                if (mgr.has(key)) {
                    return mgr.get(key);
                }
                let instance = factory(injector, ...providers);
                mgr.set(key, instance);
                return instance;
            }
            : (...providers: ParamProviders[]) => factory(injector, ...providers);
    }

    /**
     * inject type.
     *
     * @template T
     * @param {IInjector} injector
     * @param {Type<T>} type
     * @param {boolean} [singleton]
     * @param {SymbolType<T>} [provide]
     * @returns {this}
     * @memberof IIocContainer
     */
    protected injectType<T>(injector: IInjector, type: Type<T>, singleton?: boolean, provide?: SymbolType<T>) {
        if (!provide) {
            provide = type;
        }
        let factory = (...providers: ParamProviders[]) => {
            let mgr = injector.getInstance(IocSingletonManager);
            if (mgr.has(provide)) {
                return mgr.get(provide);
            }
            let ctx = RuntimeActionContext.parse(injector, {
                tokenKey: provide,
                targetType: type,
                singleton: singleton,
                providers: providers
            });
            this.getInstance<IActionInjector>(actionInjectorKey).get(RuntimeLifeScope).register(ctx);
            return ctx.target;
        };

        injector.set(type, factory);
        if (provide !== type) {
            injector.set(provide, factory, type);
        }

        (async () => {
            this.getInstance<IActionInjector>(actionInjectorKey).get(DesignLifeScope).register(
                DesignActionContext.parse(injector, {
                    tokenKey: provide,
                    targetType: type
                }));
        })();
    }
}
