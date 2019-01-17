import {
    Type, IContainer, ModuleInjector, InjectModuleInjectorToken, IModuleValidate,
    Inject, Token, ParamProviders, isArray, IModuleInjector, Container,
    InjectClassProvidesToken, IMetaAccessor, MetaAccessorToken, Singleton
} from '@ts-ioc/core';
import { DIModuleValidateToken } from './DIModuleValidate';
import { DIModule } from '../decorators/DIModule';
import { ContainerPoolToken } from '../utils';
import { ModuleConfigure } from './ModuleConfigure';
import { InjectedModuleToken, InjectedModule } from './InjectedModule';


/**
 * DIModule injector interface.
 *
 * @export
 * @interface IDIModuleInjector
 * @extends {IModuleInjector}
 */
export interface IDIModuleInjector extends IModuleInjector {

    /**
     * get meta accessor.
     *
     * @template T
     * @param {IContainer} container
     * @param {Token<T>} token
     * @returns {IMetaAccessor<T>}
     * @memberof IDIModuleInjector
     */
    getMetaAccessor<T>(container: IContainer, token: Token<T> | Token<T>[]): IMetaAccessor<T>;
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
@Singleton(DIModuleInjectorToken)
export class DIModuleInjector extends ModuleInjector implements IDIModuleInjector {

    constructor(@Inject(DIModuleValidateToken) validate: IModuleValidate) {
        super(validate)
    }

    protected async setup(container: IContainer, type: Type<any>) {
        await this.importModule(container, type);
    }

    protected syncSetup(container: IContainer, type: Type<any>) {
        throw new Error('DIModule can not sync setup.');
    }

    protected valid(container: IContainer, type: Type<any>): boolean {
        if (!this.validate) {
            return true;
        }
        return this.validate.valid(type);
    }

    getMetaAccessor<T>(container: IContainer, token: Token<T> | Token<T>[]): IMetaAccessor<T> {
        return container.getService(MetaAccessorToken, token);
    }

    protected async importModule(container: IContainer, type: Type<any>): Promise<InjectedModule<any>> {
        let pools = container.get(ContainerPoolToken);
        let newContainer = pools.create(type, container);
        newContainer.register(type);
        let builder = newContainer.getBuilder();
        let decorator = this.validate.getDecorator();
        let accor = this.getMetaAccessor(newContainer, decorator);
        let metaConfig = accor.getMetadata(type, newContainer, undefined, decorator ? dec => dec === decorator : undefined) as ModuleConfigure;
        metaConfig = await this.registerConfgureDepds(newContainer, metaConfig, type);

        let exps: Type<any>[] = [].concat(...builder.loader.getTypes(metaConfig.exports || []));
        let classProvides = [];
        exps.forEach(ty => {
            let classPd = newContainer.resolveValue(new InjectClassProvidesToken(ty));
            if (classPd && isArray(classPd.provides) && classPd.provides.length) {
                classProvides = classProvides.concat(classPd.provides);
            }
        });

        let injMd = new InjectedModule(metaConfig.token || type, metaConfig, newContainer, type, exps);
        container.bindProvider(new InjectedModuleToken(type), injMd);

        await this.importConfigExports(container, newContainer, injMd);

        return injMd;
    }


    protected async registerConfgureDepds(container: IContainer, config: ModuleConfigure, type?: Type<any>): Promise<ModuleConfigure> {
        if (isArray(config.imports) && config.imports.length) {
            await container.loadModule(...config.imports);
        }

        if (!type && isArray(config.providers) && config.providers.length) {
            await this.bindProvider(container, config.providers);
        }
        return config;
    }

    protected async importConfigExports(container: IContainer, providerContainer: IContainer, injMd: InjectedModule<any>) {
        if (container === providerContainer) {
            return container;
        }
        if (injMd) {
            let chain = container.getResolvers();
            chain.next(injMd);
            if (injMd.exports && injMd.exports.length) {
                providerContainer.getResolvers().toArray().filter(r => {
                    if (r instanceof Container) {
                        return false;
                    } else {
                        return injMd.exports.indexOf(r.type) >= 0
                    }
                }).forEach(r => {
                    chain.next(r);
                });
            }
        }

        return container;
    }

    protected bindProvider(container: IContainer, providers: ParamProviders[]): Token<any>[] {
        let parser = container.getProviderParser();
        let pdrmap = parser.parse(...providers);
        let tokens = pdrmap.provides();
        tokens.forEach(key => {
            container.bindProvider(key, (...providers: ParamProviders[]) => pdrmap.resolve(key, ...providers));
        });
        return tokens;
    }
}
