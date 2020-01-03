import 'reflect-metadata';
import { IIocContainer, ContainerFactoryToken, ContainerFactory } from './IIocContainer';
import { Type, Token, Factory, SymbolType, InstanceFactory } from './types';
import { isClass, isFunction, isDefined } from './utils/lang';
import { registerCores } from './registerCores';
import { ParamProviders, InjectTypes } from './providers/types';
import { IocSingletonManager } from './actions/IocSingletonManager';
import { DesignActionContext } from './actions/design/DesignActionContext';
import { DesignLifeScope } from './actions/DesignLifeScope';
import { IInjector } from './IInjector';
import { BaseInjector, isInjector } from './BaseInjector';
import { ActionInjectorToken, IActionInjector } from './actions/Action';
import { ProviderParser } from './providers/ProviderParser';
import { InjectToken } from './InjectToken';
import { ITypeReflects, TypeReflectsToken } from './services/ITypeReflects';


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

    getTypeReflects(): ITypeReflects {
        return this.get(TypeReflectsToken);
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
            let classFactory;
            if (isDefined(value)) {
                if (isFunction(value)) {
                    if (isClass(value)) {
                        this.registerType(injector, value, key, singleton);
                    } else {
                        classFactory = this.createCustomFactory(injector, key, value, singleton);
                    }
                } else if (singleton && value !== undefined) {
                    classFactory = this.createCustomFactory(injector, key, () => value, singleton);
                }

            } else if (isClass(key)) {
                this.registerType(injector, key, key, singleton);
            }

            if (classFactory) {
                injector.set(key, classFactory);
            }
        })();
        return this;
    }

    protected parse(...providers: InjectTypes[]): IInjector {
        return this.getInstance(ProviderParser).parse(...providers);
    }

    protected createCustomFactory<T>(injector: IInjector, key: SymbolType<T>, factory?: InstanceFactory<T>, singleton?: boolean) {
        return singleton ?
            (...providers: ParamProviders[]) => {
                let mgr = injector.getInstance(IocSingletonManager);
                if (mgr.has(key)) {
                    return mgr.get(key);
                }
                let instance = factory(this.parse({ provide: InjectToken, useValue: injector }, ...providers));
                mgr.set(key, instance);
                return instance;
            }
            : (...providers: ParamProviders[]) => factory(this.parse({ provide: InjectToken, useValue: injector }, ...providers));
    }

    /**
     * register type class.
     * @param type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this;
    /**
     * register type class.
     * @param injector register in the injector.
     * @param type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerType<T>(injector: IInjector, type: Type<T>, provide?: Token<T>, singleton?: boolean): this;
    registerType<T>(arg1: any, arg2: any, arg3?: any, singleton?: boolean): this {
        let injector: IInjector;
        let type: Type<T>;
        let provide: Token<T>;
        if (isInjector(arg1)) {
            injector = arg1;
            type = arg2;
            provide = arg3 || arg2;
        } else {
            injector = this;
            type = arg1;
            provide = arg2 || arg1;
            singleton = arg3;
        }

        // (async () => {
        this.getInstance<IActionInjector>(actionInjectorKey).getInstance(DesignLifeScope).register(
            DesignActionContext.parse(injector, {
                token: provide,
                type: type,
                singleton: singleton
            }));
        // })();
        return this;
    }
}
