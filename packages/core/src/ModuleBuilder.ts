import { Token, Type, ModuleType, LoadType, Providers } from './types';
import { IModuleBuilder, ModuleBuilderToken } from './IModuleBuilder';
import { IContainer, ContainerToken } from './IContainer';
import { hasClassMetadata, Autorun, isProviderMap, Provider, ParamProvider, DefModule, getTypeMetadata, Inject } from './core/index';
import { Defer, isString, lang, isFunction, isClass, isUndefined, isNull, isNumber, isBaseObject, isToken, isArray, isMetadataObject } from './utils/index';
import { IContainerBuilder } from './IContainerBuilder';
import { DefaultContainerBuilder } from './DefaultContainerBuilder';
import { ModuleConfiguration } from './ModuleConfiguration';

/**
 * server app bootstrap
 *
 * @export
 * @class ModuleBuilder
 */
export class ModuleBuilder<T> implements IModuleBuilder<T> {

    constructor(protected container: IContainer) {

    }

    /**
     * build module.
     *
     * @param {(Token<T>| ModuleConfiguration<T>)} [modules]
     * @returns {Promise<any>}
     * @memberof ModuleBuilder
     */
    async build(modules: Token<T> | Type<any> | ModuleConfiguration<T>): Promise<T> {
        let cfg = this.getConfigure(modules);
        let token = cfg.bootstrap || (isToken(modules) ? modules : null);
        if (!token) {
            return Promise.reject('not find bootstrap token.');
        }

        let container = this.container;
        container = await this.initContainer(cfg, container);
        if (isClass(token)) {
            if (!container.has(token)) {
                container.register(token);
            }
            return container.resolve(token);
        } else {
            return container.resolve(token);
        }
    }

    /**
     * get configuration.
     *
     * @returns {ModuleConfiguration<T>}
     * @memberof ModuleBuilder
     */
    getConfigure(modules?: Token<any> | ModuleConfiguration<T>): ModuleConfiguration<T> {
        let cfg: ModuleConfiguration<T>;
        if (isClass(modules)) {
            cfg = this.getMetaConfig(modules);
        } else {
            cfg = (isMetadataObject(modules) ? modules : {}) as ModuleConfiguration<T>;
        }
        return cfg;
    }

    protected getMetaConfig(bootModule: Type<any>): ModuleConfiguration<T> {
        if (hasClassMetadata(DefModule, bootModule)) {
            let meta = getTypeMetadata<T>(DefModule, bootModule);
            if (meta && meta.length) {
                return meta[0];
            }
        }
        return null;
    }


    protected async initContainer(config: ModuleConfiguration<T>, container: IContainer): Promise<IContainer> {

        if (isArray(config.imports) && config.imports.length) {
            await container.loadModule(container, ...config.imports);
        }

        if (isArray(config.providers) && config.providers.length) {
            this.bindProvider(container, config.providers);
        }

        return container;
    }

    protected bindProvider(container: IContainer, providers: Providers[]) {
        providers.forEach((p, index) => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (isProviderMap(p)) {
                p.forEach((k, f) => {
                    container.bindProvider(k, f);
                });
            } else if (p instanceof Provider) {
                container.bindProvider(p.type, (...providers: Providers[]) => p.resolve(container, ...providers));
            } else if (isClass(p)) {
                if (!container.has(p)) {
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
                        container.bindProvider(pr.provide, () => pr.useValue);
                    } else if (isClass(pr.useClass)) {
                        if (!container.has(pr.useClass)) {
                            container.register(pr.useClass);
                        }
                        container.bindProvider(pr.provide, pr.useClass);
                    } else if (isFunction(pr.useFactory)) {
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
                        }
                    });
                }
            } else if (isFunction(p)) {
                container.bindProvider(name, () => p);
            }
        });
    }
}

