import { Type, Modules, Provider, AbstractType, InjectUtil, Provide } from '@tsdi/ioc';
import { Application, ApplicationContextFactory, DEFAULTA_PROVIDERS, ModuleLoader, ApplicationArguments } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { ConfigureMergerImpl, DefaultConfigureManager } from './configure/manager';
import { ApplicationConfiguration } from './configure/config';
import { BootApplicationContext, BootApplicationOption, BootEnvironmentOption } from './context';
import { BootApplicationFactory } from './impl/context';
import { ConfigureFileLoader } from './configure/loader';
import { MvcModule } from './mvc/mvc.module';



export class BootApplication<T = any> extends Application<T> {

    constructor(target: Type<T> | BootApplicationOption<T>, loader?: ModuleLoader) {
        super(target, loader)
    }

    protected override getPlatformDefaultProviders(): Provider[] {
        return BOOT_DEFAULTA_PROVIDERS
    }

    protected override getRootDefaultProviders(): Provider[] {
        return BOOT_ROOT_DEFAULT_PROVIDERS;
    }


    protected override initRoot() {
        this.root.setValue(BootApplication, this)
    }

    protected override getDeps(): Modules[] {
        return [MvcModule];
    }

    protected async prepareContext(ctx: BootApplicationContext<T>): Promise<void> {
        const root = ctx.getParent();
        const mgr = ctx.getConfigureManager();
        await mgr.load();
        const config = mgr.getConfig();

        const loader = this.loader;
        if (config.deps && config.deps.length) {
            await loader.register(root, config.deps)
        }

        if (config.providers && config.providers.length) {
            InjectUtil.inject(root, config.providers)
        }

        if (ctx.baseURL) {
            config.baseURL = ctx.baseURL
        } else if (config.baseURL) {
            const appArgs = root.get(ApplicationArguments, null);
            if (appArgs) {
                appArgs.mergeEnvironment({ baseURL: config.baseURL });
            }
        }

        ctx.setValue(ApplicationConfiguration, config);

        if (config.logConfig) {
            await InjectUtil.use(root, LoggerModule.withOptions(config.logConfig, config.debug))
        }

        await super.prepareContext(ctx)
    }

    static run<T>(target: BootApplicationOption<T>): Promise<BootApplicationContext<T>>
    static run<T>(target: AbstractType<T>, option?: BootEnvironmentOption): Promise<BootApplicationContext<T>>;
    static run<T>(target: any, option?: BootEnvironmentOption): Promise<BootApplicationContext<T>> {
        return new BootApplication<T>(option ? { module: target, ...option } as BootApplicationOption<T> : target).run() as Promise<BootApplicationContext<T>>
    }
}

const BOOT_DEFAULTA_PROVIDERS: Provider[] = [
    ConfigureFileLoader,
    DEFAULTA_PROVIDERS.filter(p => (p as Provide<any>).provide !== ApplicationContextFactory),
    { provide: ApplicationContextFactory, useClass: BootApplicationFactory }
];

const BOOT_ROOT_DEFAULT_PROVIDERS = [
    DefaultConfigureManager,
    ConfigureMergerImpl
];

