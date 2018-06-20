import { Token, Type, Providers } from './types';
import { IModuleBuilder } from './IModuleBuilder';
import { IContainer } from './IContainer';
import { hasClassMetadata, isProviderMap, Provider, DefModule, getTypeMetadata } from './core/index';
import { isString, lang, isFunction, isClass, isUndefined, isNull, isBaseObject, isToken, isArray } from './utils/index';
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
     * @param {(Token<T>| ModuleConfiguration<T>)} [token]
     * @returns {Promise<any>}
     * @memberof ModuleBuilder
     */
    async build(token: Token<T> | Type<any> | ModuleConfiguration<T>, moduleDecorator?: Function | string): Promise<T> {
        let cfg = this.getConfigure(token, moduleDecorator);
        let bootToken = this.getBootstrapToken(cfg, isToken(token) ? token : null);
        if (!bootToken) {
            return Promise.reject('not find bootstrap token.');
        }

        let container = this.container;
        await this.registerDepdences(cfg);
        if (isClass(bootToken)) {
            if (!container.has(bootToken)) {
                container.register(bootToken);
            }
            return container.resolve(bootToken);
        } else {
            return container.resolve(bootToken);
        }
    }

    protected getBootstrapToken(cfg: ModuleConfiguration<T>, token?: Token<T> | Type<any>): Token<T> {
        return cfg.bootstrap || token;
    }

    /**
     * get configuration.
     *
     * @returns {ModuleConfiguration<T>}
     * @memberof ModuleBuilder
     */
    getConfigure(token?: Token<any> | ModuleConfiguration<T>, moduleDecorator?: Function | string): ModuleConfiguration<T> {
        let cfg: ModuleConfiguration<T>;
        moduleDecorator = moduleDecorator || DefModule;
        if (isClass(token)) {
            cfg = this.getMetaConfig(token, moduleDecorator);
        } else if (isToken(token)) {
            let tokenType = this.container.getTokenImpl(token);
            if (isClass(tokenType)) {
                cfg = this.getMetaConfig(tokenType, moduleDecorator);
            }
        } else {
            cfg = token as ModuleConfiguration<T>;
            let bootToken = this.getBootstrapToken(cfg);
            let typeTask = isClass(bootToken) ? bootToken : this.container.getTokenImpl(bootToken);
            if (isClass(typeTask)) {
                cfg = lang.assign({}, this.getMetaConfig(typeTask, moduleDecorator), cfg || {});
            }
        }
        return cfg || {};
    }

    protected getMetaConfig(bootModule: Type<any>, moduleDecorator: Function | string): ModuleConfiguration<T> {
        if (hasClassMetadata(moduleDecorator, bootModule)) {
            let meta = getTypeMetadata<T>(moduleDecorator, bootModule);
            if (meta && meta.length) {
                return meta[0];
            }
        }
        return null;
    }


    protected async registerDepdences(config: ModuleConfiguration<T>): Promise<IContainer> {

        if (isArray(config.imports) && config.imports.length) {
            await this.container.loadModule(...config.imports);
        }

        if (isArray(config.providers) && config.providers.length) {
            this.bindProvider(this.container, config.providers);
        }

        return this.container;
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

