import { lang, IActionSetup, IocAction, ActionType, AsyncHandler, Actions } from '@tsdi/ioc';
import { LogConfigureToken, DebugLogAspect, LogModule } from '@tsdi/logs';
import { ApplicationContext } from '../Context';
import { Service } from '../services/service';
import { CONFIGURATION, PROCESS_ROOT, SERVERS } from '../metadata/tk';



/**
 * handle interface.
 *
 * @export
 * @interface IBuildHandle
 * @template T
 */
export interface IBuildHandle<T extends ApplicationContext = ApplicationContext> extends IocAction<T, AsyncHandler<T>, Promise<void>> { }

/**
 *  handle type.
 */
export type HandleType<T extends ApplicationContext = ApplicationContext> = ActionType<IBuildHandle<T>, AsyncHandler<T>>;

/**
 * build handle.
 *
 * @export
 * @abstract
 * @class BuildHandle
 * @extends {Handle<T>}
 * @template T
 */
export abstract class BuildHandle<T extends ApplicationContext> extends IocAction<T, AsyncHandler<T>, Promise<void>> implements IBuildHandle<T> { }

/**
 * composite build handles.
 *
 * @export
 * @class BuildHandles
 * @extends {Handles<T>}
 * @template T
 */
export class BuildHandles<T extends ApplicationContext = ApplicationContext> extends Actions<T, HandleType<T>, AsyncHandler<T>, Promise<void>> {

    protected override getPlatform(ctx: T) {
        return ctx.injector.platform();
    }
}

/**
 * boot configure load handle.
 *
 * @export
 * @class ConfigureLoadHandle
 * @extends {BootHandle}
 */
export const ConfigureLoadHandle = async function (ctx: ApplicationContext, next: () => Promise<void>): Promise<void> {

    const { baseURL, injector } = ctx;
    const mgr = ctx.getConfigureManager();
    let config = await mgr.getConfig();

    if (config.deps && config.deps.length) {
        await injector.load(config.deps);
    }

    if (config.providers && config.providers.length) {
        injector.inject(config.providers);
    }

    if (!baseURL && config.baseURL) {
        injector.setValue(PROCESS_ROOT, config.baseURL);
    }

    config = { ...config, ...injector.moduleReflect.annotation };
    injector.setValue(CONFIGURATION, config);

    if (config.logConfig) {
        if (!injector.has(LogConfigureToken)) {
            injector.setValue(LogConfigureToken, config.logConfig);
        }
        injector.setValue(LogConfigureToken, config.logConfig);
    }
    if (config.debug) {
        // make sure log module registered.
        injector.register(LogModule, DebugLogAspect);
    }

    return await next();
};

/**
 * configure register servers scope.
 */
export class RegisterHandles extends BuildHandles<ApplicationContext> implements IActionSetup {

    setup() {
        this.use(ConfigureServerHandle);
    }
}


/**
 * configure register server handle.
 *
 * @export
 */
export const ConfigureServerHandle = async function (ctx: ApplicationContext, next: () => Promise<void>): Promise<void> {
    const injector = ctx.injector;
    const servers = injector.get(SERVERS);
    if (servers && servers.length) {
        const platform = injector.platform();
        await Promise.all(servers.map(type => {
            const svr = platform.getInstance(type);
            ctx.onDestroy(() => svr?.disconnect());
            return svr.connect(ctx);
        }));
    }
    return await next();
};


/**
 * configure startup services scope.
 */
export class StartupHandles extends BuildHandles<ApplicationContext> implements IActionSetup {

    setup() {
        this.use(ConfigureServiceHandle);
    }
}


/**
 * statup application deps service and configure service.
 * @param ctx boot context
 * @param next next step.
 */
export const ConfigureServiceHandle = async function (ctx: ApplicationContext, next: () => Promise<void>): Promise<void> {
    const platform = ctx.injector.platform();
    const boots = ctx.boots;
    if (boots?.length) {
        await lang.step(boots.map(tyser => () => {
            const ser = platform.getInstance(tyser) as Service;
            ctx.onDestroy(() => ser.destroy());
            ctx.startups.push(tyser);
            return ser?.configureService(ctx);
        }));
    }
    return await next();
};


/**
 * bootstrap service scope.
 */
export class BootstrapHandles extends BuildHandles<ApplicationContext> implements IActionSetup {
    setup() {
        this.use(ModuleBootstrap);
    }
}


export const ModuleBootstrap = async function (ctx: ApplicationContext, next: () => Promise<void>): Promise<void> {
    const injector = ctx.injector;
    if (injector.moduleReflect.bootstrap && injector.moduleReflect.bootstrap.length) {
        await Promise.all(injector.moduleReflect.bootstrap.map(b => ctx.bootstrap(b)));
    }
    return await next();
};
