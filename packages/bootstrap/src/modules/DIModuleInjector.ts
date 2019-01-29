import {
    Type, IContainer, ModuleInjector, InjectModuleInjectorToken, IModuleValidate,
    Inject, Token, isArray, IModuleInjector, InjectClassProvidesToken, IMetaAccessor,
    MetaAccessorToken, Singleton, ProviderMap, InjectReference, ResoveWay, IResolver, ClassType
} from '@ts-ioc/core';
import { DIModuleValidateToken } from './DIModuleValidate';
import { DIModule } from '../decorators/DIModule';
import { ContainerPoolToken } from '../utils';
import { ModuleConfigure } from './ModuleConfigure';
import { InjectedModuleToken, InjectedModule } from './InjectedModule';
import { ConfigureRegister } from '../boot/ConfigureRegister';
import { ConfigureMgrToken } from '../boot/IConfigureManager';
import { CurrentRunnableBuilderToken } from '../boot/IRunnableBuilder';


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

        let decorator = this.validate.getDecorator();
        let accor = this.getMetaAccessor(newContainer, decorator);
        let metaConfig = accor.getMetadata(type, newContainer, undefined, decorator ? dec => dec === decorator : undefined) as ModuleConfigure;

        await this.registerConfgureDepds(newContainer, metaConfig, type);
        let exps = await this.getConfigExports(newContainer, metaConfig);

        let injMd = new InjectedModule(metaConfig.token || type, metaConfig, newContainer, type, exps);

        container.bindProvider(new InjectReference(ProviderMap, type), exps);
        container.bindProvider(new InjectedModuleToken(type), injMd);

        await this.registerConfigExports(container, newContainer, injMd);

        await this.initDIModule(newContainer, injMd);

        return injMd;
    }


    protected async registerConfgureDepds(container: IContainer, config: ModuleConfigure, type?: Type<any>): Promise<void> {
        if (isArray(config.imports) && config.imports.length) {
            await container.loadModule(...config.imports);
        }
    }

    protected async getConfigExports(container: IContainer, config: ModuleConfigure): Promise<ProviderMap> {
        let parser = container.getProviderParser();
        let map = parser.parse(...config.providers || []);
        // bind module providers
        container.bindProviders(map);

        let builder = container.getBuilder();
        let exptypes: Type<any>[] = [].concat(...builder.loader.getTypes(config.exports || []));
        exptypes.forEach(ty => {
            let classPd = container.resolveValue(new InjectClassProvidesToken(ty));
            map.add(ty, (...pds) => container.resolve(ty, ResoveWay.nodes, ...pds));
            if (classPd && isArray(classPd.provides) && classPd.provides.length) {
                classPd.provides.forEach(p => {
                    if (!map.has(p)) {
                        map.add(p, (...pds) => container.resolve(p, ResoveWay.nodes, ...pds));
                    }
                });
            }
        });

        return map;
    }

    protected async registerConfigExports(container: IContainer, newContainer: IContainer, injMd: InjectedModule<any>) {
        if (container === newContainer) {
            return container;
        }
        if (injMd) {
            let chain = container.getResolvers();
            chain.next(injMd);
        }

        return container;
    }

    protected async initDIModule(newContainer: IContainer, injMd: InjectedModule<any>) {

        let registers: {
            resolver: IResolver,
            serType: ClassType<ConfigureRegister<any>>
        }[] = [];

        newContainer.iteratorServices(
            (serType, fac, resolver) => {
                registers.push({
                    resolver: resolver,
                    serType: serType
                });
            },
            ConfigureRegister,
            injMd.type, true, ResoveWay.current);

        let mgr = newContainer.get(ConfigureMgrToken);
        let appConfig = await mgr.getConfig();
        await Promise.all(registers.map(ser => ser.resolver.resolve(ser.serType).register(appConfig, ser.resolver.resolve(CurrentRunnableBuilderToken))));
    }
}
