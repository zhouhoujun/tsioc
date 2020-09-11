import { Type } from './types';
import { isClass, isFunction, isDefined } from './utils/lang';
import { InjectToken, Token, Factory, SymbolType, Provider, InstanceFactory } from './tokens';
import { IInjector } from './IInjector';
import { IIocContainer } from './IIocContainer';
import { registerCores } from './regs';
import { BaseInjector } from './BaseInjector';
import { ActionInjectorToken, IActionInjector } from './actions/Action';
import { ITypeReflects } from './services/ITypeReflects';
import { DesignContext } from './actions/des-act';
import { DesignLifeScope } from './actions/design';
import { InjectorFactoryToken, PROVIDERS, TypeReflectsToken } from './tk';


/**
 * Container
 *
 * @export
 * @class IocContainer
 * @implements {IIocContainer}
 */
export class IocContainer extends BaseInjector implements IIocContainer {

    getTypeReflects(): ITypeReflects {
        return this.getSingleton(TypeReflectsToken);
    }

    getActionInjector(): IActionInjector {
        return this.getSingleton(ActionInjectorToken);
    }

    getContainer(): this {
        return this;
    }

    /**
     * get injector
     * @param type
     */
    getInjector(type: Type): IInjector {
        return this.getTypeReflects().getInjector(type);
    }

    createInjector(): IInjector {
        return this.getInstance(InjectorFactoryToken);
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

    registerSingleton<T>(token: Token<T>, fac?: Factory<T>): this {
        this.registerFactory(this, token, fac, true);
        return this;
    }

    registerFactory<T>(injector: IInjector, token: Token<T>, value?: Factory<T>, singleton?: boolean): this {
        (async () => {
            let key = injector.getTokenKey(token);
            let classFactory;
            if (isDefined(value)) {
                if (isFunction(value)) {
                    if (isClass(value)) {
                        this.registerIn(injector, value, key, singleton);
                    } else {
                        classFactory = this.createCustomFactory(injector, key, value, singleton);
                    }
                } else if (singleton && value !== undefined) {
                    classFactory = this.createCustomFactory(injector, key, () => value, singleton);
                }

            } else if (isClass(key)) {
                this.registerIn(injector, key, null, singleton);
            }

            if (classFactory) {
                injector.set(key, classFactory);
            }
        })();
        return this;
    }

    /**
     * register type class.
     * @param type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this {
        return this.registerIn(this, type, provide, singleton);
    }
    /**
     * register type class.
     * @param injector register in the injector.
     * @param type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerIn<T>(injector: IInjector, type: Type<T>, provide?: Token<T>, singleton?: boolean) {
        // make sure class register once.
        if (this.getTypeReflects().hasRegister(type) || this.hasRegister(type)) {
            if (provide) {
                this.set(provide, (...providers) => injector.resolve(type, ...providers));
            }
            return this;
        }

        (async () => {
            this.getActionInjector().getInstance(DesignLifeScope).register(
                DesignContext.parse(injector, {
                    token: provide,
                    type: type,
                    singleton: singleton
                }));
        })();
        return this;
    }

    protected initReg() {
        super.initReg();
        registerCores(this);
    }

    protected parse(...providers: Provider[]): IInjector {
        return this.getInstance(PROVIDERS).inject(...providers);
    }

    protected createCustomFactory<T>(injector: IInjector, key: SymbolType<T>, factory?: InstanceFactory<T>, singleton?: boolean) {
        return singleton ?
            (...providers: Provider[]) => {
                if (injector.hasSingleton(key)) {
                    return injector.getSingleton(key);
                }
                let instance = factory(this.parse({ provide: InjectToken, useValue: injector }, ...providers));
                injector.setSingleton(key, instance);
                return instance;
            }
            : (...providers: Provider[]) => factory(this.parse({ provide: InjectToken, useValue: injector }, ...providers));
    }
}
