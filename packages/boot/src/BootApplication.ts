import { ModuleLoader, Modules, ProviderType, StaticProviders, Type } from '@tsdi/ioc';
import { Application, ApplicationFactory, APPLICTION_DEFAULTA_PROVIDERS, LoggerModule, PROCESS_ROOT } from '@tsdi/core';
import { ConfigureMergerImpl, DefaultConfigureManager } from './configure/manager';
import { ApplicationConfiguration } from './configure/config';
import { BootApplicationContext, BootApplicationOption, BootEnvironmentOption } from './context';
import { BootApplicationFactory } from './impl/context';
import { ConfigureFileLoader } from './configure/loader';
import { MvcModule } from './mvc/mvc.module';


const BOOT_DEFAULTA_PROVIDERS: ProviderType[] = [
    ConfigureFileLoader,
    { provide: ApplicationFactory, useClass: BootApplicationFactory },
    ...APPLICTION_DEFAULTA_PROVIDERS.filter(p => (p as StaticProviders).provide !== ApplicationFactory)
];

/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication extends Application<BootApplicationContext> {

    constructor(protected target: Type | BootApplicationOption, protected loader?: ModuleLoader) {
        super(target, loader)
    }

    protected override getDefaultProviders(): ProviderType[] {
        return BOOT_DEFAULTA_PROVIDERS
    }

    protected override initRoot() {
        this.root.register(DefaultConfigureManager, ConfigureMergerImpl);
        super.initRoot();
        this.root.setValue(BootApplication, this)
    }

    protected override getDeps(): Modules[] {
        return [MvcModule];
    }

    protected async prepareContext(ctx: BootApplicationContext): Promise<void> {
        const { baseURL, injector } = ctx;
        const mgr = ctx.getConfigureManager();
        await mgr.load();
        const config = mgr.getConfig();

        if (config.deps && config.deps.length) {
            await injector.load(config.deps)
        }

        if (config.providers && config.providers.length) {
            injector.inject(config.providers)
        }

        if (baseURL) {
            config.baseURL = baseURL
        } else if (config.baseURL) {
            injector.setValue(PROCESS_ROOT, config.baseURL)
        }

        if (injector.moduleReflect.annotation?.debug) {
            config.debug = injector.moduleReflect.annotation.debug
        }

        injector.setValue(ApplicationConfiguration, config);

        if (config.logConfig) {
            injector.import(LoggerModule.withOptions(config.logConfig, config.debug))
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
    static run(target: BootApplicationOption): Promise<BootApplicationContext>
    /**
     * run application.
     *
     * @static
     * @param {Type<T>} target
     * @param {BootApplicationOption} [option]  application run depdences.
     * @returns {Promise<IBootContext>}
     */
    static run(target: Type, option?: BootEnvironmentOption): Promise<BootApplicationContext>;
    static override run(target: Type | BootApplicationOption, option?: BootEnvironmentOption): Promise<BootApplicationContext> {
        return new BootApplication(option ? { module: target, ...option } as BootApplicationOption : target).run()
    }
}


