import {
    Type, IContainer, ModuleInjector, InjectModuleInjectorToken, IModuleValidate,
    Inject, Token, isToken, Providers, Injectable, isArray, lang, isUndefined, isClass,
    isFunction, isString, isNull, isProviderMap, Provider, isBaseObject, IModuleInjector, Container
} from '@ts-ioc/core';
import { DIModuelValidateToken } from './DIModuleValidate';
import { DIModule } from '../decorators';
import { ContainerPoolToken } from '../utils';
import { ModuleConfigure, ModuleConfig } from './ModuleConfigure';
import { InjectedModuleToken, InjectedModule } from './InjectedModule';

const exportsProvidersFiled = '__exportProviders';

/**
 * DIModule injector interface.
 *
 * @export
 * @interface IDIModuleInjector
 * @extends {IModuleInjector}
 */
export interface IDIModuleInjector extends IModuleInjector {
    /**
     * import module type.
     *
     * @template T
     * @param {IContainer} container
     * @param {Type<T>} type
     * @returns {Promise<InjectedModule<T>>}
     * @memberof IDIModuleInjector
     */
    import<T>(container: IContainer, type: Type<T>): Promise<InjectedModule<T>>;

    /**
     * import by config.
     *
     * @template T
     * @param {IContainer} container
     * @param {ModuleConfig<T>} config
     * @returns {Promise<any>>}
     * @memberof IDIModuleInjector
     */
    importByConfig<T>(container: IContainer, config: ModuleConfig<T>): Promise<any>;
}

/**
 * DIModule injector token.
 */
export const DIModuleInjectorToken = new InjectModuleInjectorToken<IDIModuleInjector>(DIModule.toString());

/**
 * DIModule injector.
 *
 * @export
 * @class DIModuleInjector
 * @extends {ModuleInjector}
 */
@Injectable(DIModuleInjectorToken)
export class DIModuleInjector extends ModuleInjector implements IDIModuleInjector {

    constructor(@Inject(DIModuelValidateToken) validate: IModuleValidate) {
        super(validate)
    }

    protected async setup(container: IContainer, type: Type<any>) {
        await this.importModule(container, type);
    }

    async import<T>(container: IContainer, type: Type<T>): Promise<InjectedModule<T>> {
        if (this.validate.validate(type)) {
            let injMd = await this.importModule(container, type);
            return injMd;
        } else {
            return null;
        }
    }

    async importByConfig<T>(container: IContainer, config: ModuleConfig<T>): Promise<any> {
        await this.registerConfgureDepds(container, config);
        if (isArray(config.providers) && config.providers.length) {
            await this.bindProvider(container, config.providers);
        }
        return null;
    }

    protected async importModule(container: IContainer, type: Type<any>): Promise<InjectedModule<any>> {
        let pools = container.get(ContainerPoolToken);
        let newContainer = pools.create(container);
        newContainer.register(type);
        let metaConfig = this.validate.getMetaConfig(type, newContainer) as ModuleConfigure;
        metaConfig = await this.registerConfgureDepds(newContainer, metaConfig);

        let injMd = new InjectedModule(type, metaConfig, newContainer, type, metaConfig.exports || [], metaConfig[exportsProvidersFiled]);
        container.bindProvider(new InjectedModuleToken(type), injMd);

        await this.importConfigExports(container, newContainer, injMd);

        return injMd;
    }


    protected async registerConfgureDepds(container: IContainer, config: ModuleConfigure): Promise<ModuleConfigure> {
        if (isArray(config.imports) && config.imports.length) {
            await container.loadModule(...config.imports);
        }

        if (isArray(config.providers) && config.providers.length) {
            config[exportsProvidersFiled] = this.bindProvider(container, config.providers);
        }
        return config;
    }

    protected async importConfigExports(container: IContainer, providerContainer: IContainer, injMd: InjectedModule<any>) {
        if (container === providerContainer) {
            return container;
        }
        if (injMd) {
            container.resolveChain.next(injMd);
            if (injMd.exports && injMd.exports.length) {
                let expchs = providerContainer.resolveChain.toArray().filter(r => {
                    if (r instanceof Container) {
                        return false;
                    } else {
                        return injMd.exports.indexOf(r.type) >= 0
                    }
                });
                expchs.forEach(r => {
                    container.resolveChain.next(r);
                });
            }
        }

        return container;
    }

    protected bindProvider(container: IContainer, providers: Providers[]): Token<any>[] {
        let tokens: Token<any>[] = [];
        providers.forEach((p, index) => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (isProviderMap(p)) {
                p.forEach((k, f) => {
                    tokens.push(k);
                    container.bindProvider(k, f);
                });
            } else if (p instanceof Provider) {
                tokens.push(p.type);
                container.bindProvider(p.type, (...providers: Providers[]) => p.resolve(container, ...providers));
            } else if (isClass(p)) {
                if (!container.has(p)) {
                    tokens.push(p);
                    container.register(p);
                }
            } else if (isBaseObject(p)) {
                let pr: any = p;
                let isobjMap = false;
                if (isToken(pr.provide)) {
                    if (isArray(pr.deps) && pr.deps.length) {
                        pr.deps.forEach(d => {
                            if (isClass(d) && !container.has(d)) {
                                container.register(d);
                            }
                        });
                    }
                    if (!isUndefined(pr.useValue)) {
                        tokens.push(pr.provide);
                        container.bindProvider(pr.provide, () => pr.useValue);
                    } else if (isClass(pr.useClass)) {
                        if (!container.has(pr.useClass)) {
                            container.register(pr.useClass);
                        }
                        tokens.push(pr.provide);
                        container.bindProvider(pr.provide, pr.useClass);
                    } else if (isFunction(pr.useFactory)) {
                        tokens.push(pr.provide);
                        container.bindProvider(pr.provide, () => {
                            let args = [];
                            if (isArray(pr.deps) && pr.deps.length) {
                                args = pr.deps.map(d => {
                                    if (isClass(d)) {
                                        return container.get(d);
                                    } else {
                                        return d;
                                    }
                                });
                            }
                            return pr.useFactory.apply(pr, args);
                        });
                    } else if (isToken(pr.useExisting)) {
                        if (container.has(pr.useExisting)) {
                            tokens.push(pr.provide);
                            container.bindProvider(pr.provide, pr.useExisting);
                        } else {
                            console.log('has not register:', pr.useExisting);
                        }
                    } else {
                        isobjMap = true;
                    }
                } else {
                    isobjMap = true;
                }

                if (isobjMap) {
                    lang.forIn<any>(p, (val, name: string) => {
                        if (!isUndefined(val)) {
                            if (isClass(val)) {
                                container.bindProvider(name, val);
                            } else if (isFunction(val) || isString(val)) {
                                container.bindProvider(name, () => val);
                            } else {
                                container.bindProvider(name, val);
                            }
                            tokens.push(name);
                        }
                    });
                }
            } else if (isFunction(p)) {
                tokens.push(name);
                container.bindProvider(name, () => p);
            }
        });

        return tokens;
    }
}
