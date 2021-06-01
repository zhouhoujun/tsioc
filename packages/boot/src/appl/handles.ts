import { lang, IActionSetup, ClassType, isFunction, resolveRecord, Type, IocAction, ActionType, AsyncHandler, Actions, refl } from '@tsdi/ioc';
import { LogConfigureToken, DebugLogAspect, LogModule } from '@tsdi/logs';
import { ApplicationContext } from '../Context';
import { CONFIGURATION, PROCESS_ROOT } from '../metadata/tk';
import { ConfigureRegister } from '../configure/register';
import { StartupService, IStartupService } from '../services/StartupService';



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

    protected getActionProvider(ctx: T) {
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

    await next();
};

/**
 * boot configure register handle.
 *
 * @export
 */
export const BootConfigureRegisterHandle = async function (ctx: ApplicationContext, next: () => Promise<void>): Promise<void> {
    const config = ctx.getConfiguration();
    const injector = ctx.injector;
    const container = injector.getContainer();
    if (config.logConfig && !container.has(LogConfigureToken)) {
        container.setValue(LogConfigureToken, config.logConfig);
    }
    if (config.debug) {
        // make sure log module registered.
        injector.register(LogModule, DebugLogAspect);
    }

    const regs = injector.getServices(ConfigureRegister);
    if (regs && regs.length) {
        await Promise.all(regs.map(reg => reg.register(config, ctx)));
    }
    await next();
};

/**
 * configure startup service scope.
 */
export class StartupGlobalService extends BuildHandles<ApplicationContext> implements IActionSetup {

    async execute(ctx: ApplicationContext, next: () => Promise<void>): Promise<void> {
        await super.execute(ctx);
        if (next) {
            await next();
        }
    }

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
    const startups = ctx.startups;
    const root = ctx.injector;
    const regedState = root.state();
    if (startups.length) {
        await lang.step(startups.map(tyser => () => {
            let ser: IStartupService;
            if (isFunction(tyser) && !regedState.isRegistered(tyser)) {
                root.register(tyser as Type);
            }
            ser = root.get(tyser) ?? regedState.getInstance(tyser as ClassType);
            ctx.onDestroy(() => ser?.destroy());
            return ser?.configureService(ctx);
        }));
    }

    const boots = ctx.boots;
    if (boots?.length) {
        await lang.step(boots.map(tyser => () => {
            const ser = root.get(tyser) ?? regedState.getInstance(tyser);
            ctx.onDestroy(() => ser?.destroy());
            startups.push(tyser);
            return ser.configureService(ctx);
        }));
    }

    const sers: StartupService[] = [];
    const prds = root.getServiceProviders(StartupService);
    prds.iterator((pdr, tk, pdrs) => {
        if (startups.indexOf(tk) < 0) {
            sers.push(resolveRecord(pdr, root));
        }
    });
    if (sers && sers.length) {
        await Promise.all(sers.map(ser => {
            ctx.onDestroy(() => ser?.destroy());
            startups.push(lang.getClass(ser));
            return ser.configureService(ctx);
        }));
    }
    await next();
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
    await next();
};
