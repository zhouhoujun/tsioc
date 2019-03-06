import {
    Type, Token, isArray, ProviderMap, ClassType, IResolver,
    ProviderParser, Singleton, ITypeReflect
} from '@ts-ioc/ioc';
import { ContainerPoolToken, ResolverChain } from '../services';
import { ModuleConfigure } from './ModuleConfigure';
import { ModuleResovler } from './ModuleResovler';
import { ConfigureRegister } from '../boot/ConfigureRegister';
import { ConfigureMgrToken } from '../boot/IConfigureManager';
import { CurrentRunnableBuilderToken } from '../boot/IRunnableBuilder';
import { IContainer, MetaAccessor, ModuleInjector, IteratorService, InjectorContext } from '@ts-ioc/core';

/**
 * di module reflect info.
 *
 * @export
 * @interface IDIModuleReflect
 * @extends {ITypeReflect}
 */
export interface IDIModuleReflect extends ITypeReflect {
    /**
     * module resolver of DIModule
     *
     * @type {ModuleResovler<any>}
     * @memberof IDIModuleReflect
     */
    moduleResolver?: ModuleResovler<any>;
}

/**
 * DIModule injector.
 *
 * @export
 * @class DIModuleInjector
 * @extends {ModuleInjector}
 */
@Singleton
export class DIModuleInjector extends ModuleInjector {

    getDecorator(): string {
        return '@DIModule';
    }

    /**
     * get meta accessor.
     *
     * @template T
     * @param {IContainer} container
     * @param {Token<T>} token
     * @returns {IMetaAccessor<T>}
     * @memberof DIModuleInjector
     */
    getMetaAccessor(container: IContainer, token: Token<any> | Token<any>[]): MetaAccessor {
        return container.getService(MetaAccessor, token);
    }

    protected async importModule(container: IContainer, type: Type<any>): Promise<ModuleResovler<any>> {
        let pools = container.get(ContainerPoolToken);

        let decorator = this.getDecorator();
        let accor = this.getMetaAccessor(container, decorator);
        let metaConfig = accor.getMetadata(type, container, undefined, decorator ? dec => dec === decorator : undefined) as ModuleConfigure;

        let newContainer = metaConfig.asRoot === true ? pools.getDefault() : pools.create(container);
        newContainer.register(type);

        await this.registerConfgureDepds(newContainer, metaConfig, type);
        let exps = await this.getConfigExports(newContainer, metaConfig);

        let mdResolver = new ModuleResovler(metaConfig.token || type, metaConfig, newContainer, type, exps);

        let mRef = container.getTypeReflects().get<IDIModuleReflect>(type);
        mRef.moduleResolver = mdResolver;

        if (metaConfig.asRoot) {
            return mdResolver;
        }

        await this.registerConfigExports(container, newContainer, mdResolver);

        // init global configure.
        if (!pools.isDefault(newContainer)) {
            await this.registerConfigrue(newContainer, mdResolver);
        }

        return mdResolver;
    }

    protected async registerConfgureDepds(container: IContainer, config: ModuleConfigure, type?: Type<any>): Promise<void> {
        if (isArray(config.imports) && config.imports.length) {
            await container.loadModule(...config.imports);
        }
    }

    protected async getConfigExports(container: IContainer, config: ModuleConfigure): Promise<ProviderMap> {
        let parser = container.resolve(ProviderParser);
        let tRef = container.getTypeReflects();
        let map = parser.parse(...config.providers || []);
        // bind module providers
        container.bindProviders(map);

        let exptypes: Type<any>[] = [].concat(...container.getLoader().getTypes(config.exports || []));
        exptypes.forEach(ty => {
            let classPd = tRef.get(ty);
            map.add(ty, (...pds) => container.resolve(ty, ...pds));
            if (classPd && isArray(classPd.provides) && classPd.provides.length) {
                classPd.provides.forEach(p => {
                    if (!map.has(p)) {
                        map.add(p, (...pds) => container.resolve(p, ...pds));
                    }
                });
            }
        });

        return map;
    }

    protected async registerConfigExports(container: IContainer, newContainer: IContainer, mdResolver: ModuleResovler<any>) {
        if (container === newContainer) {
            return container;
        }
        if (mdResolver) {
            let chain = container.resolve(ResolverChain);
            chain.use(mdResolver);
        }

        return container;
    }

    protected async registerConfigrue(newContainer: IContainer, injMd: ModuleResovler<any>) {

        let registers: {
            resolver: IResolver,
            serType: ClassType<ConfigureRegister<any>>
        }[] = [];


        newContainer.resolve(IteratorService).each(
            (serType, fac, resolver) => {
                registers.push({
                    resolver: resolver,
                    serType: serType
                });
            },
            ConfigureRegister,
            injMd.type, true);

        if (registers.length) {
            let mgr = newContainer.get(ConfigureMgrToken);
            let appConfig = await mgr.getConfig();
            await Promise.all(registers.map(ser => ser.resolver.resolve(ser.serType).register(appConfig, ser.resolver.resolve(CurrentRunnableBuilderToken))));
        }
    }

    protected setContext(ctx: InjectorContext, injected: Type<any>[]): void {
        if (injected && injected.length) {
            ctx.injected = ctx.injected.concat(injected);
            ctx.modules = [];
        }
    }

    protected async setup(container: IContainer, type: Type<any>) {
        await this.importModule(container, type);
    }

    protected async syncSetup(container: IContainer, type: Type<any>) {
        this.importModule(container, type);
    }
}
