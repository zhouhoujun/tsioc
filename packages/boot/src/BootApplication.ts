import { ModuleLoader, ProviderType, StaticProviders, Type } from '@tsdi/ioc';
import { Application, ApplicationFactory, ApplicationOption, APPLICTION_DEFAULTA_PROVIDERS, BootstrapOption, PROCESS_ROOT } from '@tsdi/core';
import { ConfigureMergerImpl, DefaultConfigureManager } from './configure/manager';
import { CONFIGURATION } from './configure/config';
import { DebugLogAspect, LogConfigure, LogModule } from '@tsdi/logs';
import { BootApplicationContext, BootApplicationOption } from './context';
import { BootApplicationFactory } from './impl/context';
import { ConfigureFileLoader } from './configure/loader';


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
        super(target, loader);
    }

    protected override getDefaultProviders(): ProviderType[] {
        return BOOT_DEFAULTA_PROVIDERS;
    }

    protected override initRoot() {
        this.root.register(DefaultConfigureManager, ConfigureMergerImpl);
        super.initRoot();
        this.root.setValue(BootApplication, this);
    }

    protected async configation(ctx: BootApplicationContext): Promise<void> {
        const { baseURL, injector } = ctx;
        const mgr = ctx.getConfigureManager();
        await mgr.load();
        let config = mgr.getConfig();

        if (config.deps && config.deps.length) {
            await injector.load(config.deps);
        }

        if (config.providers && config.providers.length) {
            injector.inject(config.providers);
        }

        if (baseURL) {
            config.baseURL = baseURL;
        } else if (config.baseURL) {
            injector.setValue(PROCESS_ROOT, config.baseURL);
        }

        if (injector.moduleReflect.annotation?.debug) {
            config.debug = injector.moduleReflect.annotation.debug;
        }

        injector.setValue(CONFIGURATION, config);

        if (config.logConfig) {
            injector.import(LogModule.withOptions(config.logConfig, config.debug));
            // injector.setValue(LogConfigure, config.logConfig);
        }
        // if (config.debug) {
        //     // make sure log module registered.
        //     injector.register(LogModule, DebugLogAspect);
        // }
    }

    /**
    * run application.
    *
    * @static
    * @param {BootApplicationOption<M>)} target
    * @returns {Promise<ApplicationContext<M>>}
    */
    static override run(target: BootApplicationOption): Promise<BootApplicationContext>
    /**
     * run application.
     *
     * @static
     * @param {Type<T>} target
     * @param {BootstrapOption)} [option]  application run depdences.
     * @returns {Promise<IBootContext>}
     */
    static override run(target: Type, option?: BootstrapOption): Promise<BootApplicationContext>;
    static override run(target: any, option?: BootstrapOption): Promise<BootApplicationContext> {
        return new BootApplication(option ? { type: target, ...option } as ApplicationOption : target).run();
    }
}


