import { ClassType, Modules, ProviderType, StaticProviders, Type } from '@tsdi/ioc';
import { Application, ApplicationArguments, ApplicationFactory, DEFAULTA_PROVIDERS, ModuleLoader, PROCESS_ROOT, ROOT_DEFAULT_PROVIDERS } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { ConfigureMergerImpl, DefaultConfigureManager } from './configure/manager';
import { ApplicationConfiguration } from './configure/config';
import { BootApplicationContext, BootApplicationOption, BootEnvironmentOption } from './context';
import { BootApplicationFactory } from './impl/context';
import { ConfigureFileLoader } from './configure/loader';
import { MvcModule } from './mvc/mvc.module';



/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication<T = any, TArg = ApplicationArguments> extends Application<T, TArg> {

    constructor(target: ClassType<T> | BootApplicationOption<T>, loader?: ModuleLoader) {
        super(target, loader)
    }

    protected override getPlatformDefaultProviders(): ProviderType[] {
        return BOOT_DEFAULTA_PROVIDERS
    }

    protected override getRootDefaultProviders(): ProviderType[] {
        return BOOT_ROOT_DEFAULT_PROVIDERS;
    }


    protected override initRoot() {
        this.root.setValue(BootApplication, this)
    }

    protected override getDeps(): Modules[] {
        return [MvcModule];
    }

    protected async prepareContext(ctx: BootApplicationContext<T, TArg>): Promise<void> {
        const { baseURL, injector } = ctx;
        const mgr = ctx.getConfigureManager();
        await mgr.load();
        const config = mgr.getConfig();

        const loader = this.loader;
        if (config.deps && config.deps.length) {
            await loader.register(injector, config.deps)
        }

        if (config.providers && config.providers.length) {
            injector.inject(config.providers)
        }

        if (baseURL) {
            config.baseURL = baseURL
        } else if (config.baseURL) {
            injector.setValue(PROCESS_ROOT, config.baseURL)
        }

        injector.setValue(ApplicationConfiguration, config);

        if (config.logConfig) {
            await injector.import(LoggerModule.withOptions(config.logConfig, config.debug))
        }

        await super.prepareContext(ctx)
    }

    /**
    * run application.
    *
    * @static
    * @param {BootApplicationOption<M>} target
    * @returns {Promise<ApplicationContext<M>>}
    */
    static run<T, TArg extends ApplicationArguments>(target: BootApplicationOption<T, TArg>): Promise<BootApplicationContext<T, TArg>>
    /**
     * run application.
     *
     * @static
     * @param {Type<T>} target
     * @param {BootApplicationOption} [option]  application run depdences.
     * @returns {Promise<IBootContext>}
     */
    static run<T, TArg extends ApplicationArguments>(target: Type<T>, option?: BootEnvironmentOption<TArg>): Promise<BootApplicationContext<T, TArg>>;
    static run<T, TArg extends ApplicationArguments>(target: any, option?: BootEnvironmentOption<TArg>): Promise<BootApplicationContext<T, TArg>> {
        return new BootApplication<T, TArg>(option ? { module: target, ...option } as BootApplicationOption<T, TArg> : target).run() as Promise<BootApplicationContext<T, TArg>>
    }
}

const BOOT_DEFAULTA_PROVIDERS: ProviderType[] = [
    ConfigureFileLoader,
    ...DEFAULTA_PROVIDERS.filter(p => (p as StaticProviders).provide !== ApplicationFactory),
    { provide: ApplicationFactory, useClass: BootApplicationFactory }
];

const BOOT_ROOT_DEFAULT_PROVIDERS = [
    DefaultConfigureManager,
    ConfigureMergerImpl,
    ...ROOT_DEFAULT_PROVIDERS
];

