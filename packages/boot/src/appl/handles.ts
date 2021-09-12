import { lang, IActionSetup, ClassType, isFunction, Type, IocAction, ActionType, AsyncHandler, Actions } from '@tsdi/ioc';
import { LogConfigureToken, DebugLogAspect, LogModule } from '@tsdi/logs';
import { ApplicationContext } from '../Context';
import { CONFIGURATION, CONFIGURES, PROCESS_ROOT } from '../metadata/tk';
import { IStartupService } from '../services/intf';
import { ConnectionStatupService } from '../services/startup';



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

    protected override getActionProvider(ctx: T) {
        return ctx.injector.action();
    }
}

/**
 * boot configure load handle.
 *
 * @export
 * @class BootConfigureLoadHandle
 * @extends {BootHandle}
 */
export const BootConfigureLoadHandle = async function (ctx: ApplicationContext, next: () => Promise<void>): Promise<void> {

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

    config = { ...config, ...injector.reflect.annotation };
    injector.setValue(CONFIGURATION, config);

    return await next();
};

/**
 * boot configure register handle.
 *
 * @export
 */
export const BootConfigureRegisterHandle = async function (ctx: ApplicationContext, next: () => Promise<void>): Promise<void> {
    const config = ctx.getConfiguration();
    const injector = ctx.injector;
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

    const configs = injector.get(CONFIGURES);
    if (configs && configs.length) {
        const state = injector.state();
        await Promise.all(configs.map(cfg => state.getInstance(cfg)?.register(config, ctx)));
    }
    return await next();
};


/**
 * configure startup service scope.
 */
export class StartupGlobalService extends BuildHandles<ApplicationContext> implements IActionSetup {

    setup() {
        this.use(ConnectionsHandle, ConfigureServiceHandle);
    }
}

/**
 * connection handle.
 * @param ctx context.
 * @param next next dispatch
 */
export const ConnectionsHandle = async function (ctx: ApplicationContext, next: () => Promise<void>): Promise<void> {
    const startup = ctx.injector.resolve({ token: ConnectionStatupService, target: ctx.injector.type });
    if (startup) {
        ctx.onDestroy(() => startup?.destroy());
        await startup.configureService(ctx)
    }
    return await next();
};


/**
 * statup application deps service and configure service.
 * @param ctx boot context
 * @param next next step.
 */
export const ConfigureServiceHandle = async function (ctx: ApplicationContext, next: () => Promise<void>): Promise<void> {
    const startups = ctx.startups;
    const root = ctx.injector;
    const regedState = root.state();
    if (startups.length) {
        await lang.step(startups.map(tyser => () => {
            if (isFunction(tyser) && !regedState.isRegistered(tyser)) {
                root.register(tyser as Type);
            }
            const ser = regedState.getInstance(tyser as ClassType) as IStartupService;
            ctx.onDestroy(() => ser?.destroy());
            return ser?.configureService(ctx);
        }));
    }

    const boots = ctx.boots;
    if (boots?.length) {
        await lang.step(boots.map(tyser => () => {
            const ser = regedState.getInstance(tyser) as IStartupService;
            ctx.onDestroy(() => ser?.destroy());
            startups.push(tyser);
            return ser?.configureService(ctx);
        }));
    }
    return await next();
};


/**
 * startup service scope.
 */
export class BootstrapScope extends BuildHandles<ApplicationContext> implements IActionSetup {
    setup() {
        this.use(ModuleBootstrap);
    }
}


export const ModuleBootstrap = async function (ctx: ApplicationContext, next: () => Promise<void>): Promise<void> {
    const injector = ctx.injector;
    if (injector.reflect.bootstrap && injector.reflect.bootstrap.length) {
        await Promise.all(injector.reflect.bootstrap.map(b => ctx.bootstrap(b)));
    }
    return await next();
};
