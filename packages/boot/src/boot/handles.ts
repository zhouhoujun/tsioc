import { lang, isPrimitiveType, IActionSetup, ClassType, refl, isFunction, getFacInstance, Type, IocAction, ActionType, AsyncHandler, Actions } from '@tsdi/ioc';
import { LogConfigureToken, DebugLogAspect, LogModule } from '@tsdi/logs';
import { IAnnoationContext, IBootContext } from '../Context';
import { CONFIGURATION, MODULE_STARTUPS } from '../tk';
import { ConfigureRegister } from '../configure/register';
import { StartupService, STARTUPS, IStartupService } from '../services/StartupService';
import { AnnotationReflect } from '../annotations/reflect';
import { Runnable } from '../runnable/Runnable';


/**
 * handle interface.
 *
 * @export
 * @interface IBuildHandle
 * @template T
 */
export interface IBuildHandle<T extends IAnnoationContext = IAnnoationContext> extends IocAction<T, AsyncHandler<T>, Promise<void>> { }

/**
 *  handle type.
 */
export type HandleType<T extends IAnnoationContext = IAnnoationContext> = ActionType<IBuildHandle<T>, AsyncHandler<T>>;



/**
 * build handle.
 *
 * @export
 * @abstract
 * @class BuildHandle
 * @extends {Handle<T>}
 * @template T
 */
export abstract class BuildHandle<T extends IAnnoationContext> extends IocAction<T, AsyncHandler<T>, Promise<void>> implements IBuildHandle<T> { }

/**
 * composite build handles.
 *
 * @export
 * @class BuildHandles
 * @extends {Handles<T>}
 * @template T
 */
export class BuildHandles<T extends IAnnoationContext = IAnnoationContext> extends Actions<T, HandleType<T>, AsyncHandler<T>, Promise<void>> {

    protected getActionProvider(ctx: T) {
        return ctx.injector.action();
    }
}

export class RegBootEnvScope extends BuildHandles<IBootContext> implements IActionSetup {

    async execute(ctx: IBootContext, next: () => Promise<void>): Promise<void> {
        await super.execute(ctx);
        if (next) {
            await next();
        }
    }

    setup() {
        this.use(
            BootDepsHandle,
            BootProvidersHandle,
            BootConfigureLoadHandle
        );
    }
}

/**
 * boot deps handle.
 *
 * @export
 */
export const BootDepsHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    if (ctx.deps && ctx.deps.length) {
        await ctx.injector.load(ctx.deps);
    }
    await next();
};

/**
 * boot providers handle.
 *
 * @export
 * @class BootProvidersHandle
 * @extends {BootHandle}
 */
export const BootProvidersHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    if (ctx.providers.size) {
        ctx.injector.copy(ctx.providers);
    }
    await next();
};

/**
 * boot configure load handle.
 *
 * @export
 * @class BootConfigureLoadHandle
 * @extends {BootHandle}
 */
export const BootConfigureLoadHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {

    const options = ctx.getOptions();
    const baseURL = ctx.baseURL;
    const injector = ctx.injector;
    const mgr = ctx.getConfigureManager();
    if (options.configures && options.configures.length) {
        options.configures.forEach(cfg => {
            mgr.useConfiguration(cfg);
        });
    } else {
        // load default config.
        mgr.useConfiguration();
    }
    let config = await mgr.getConfig();

    if (config.deps && config.deps.length) {
        await injector.load(config.deps);
    }

    if (config.providers && config.providers.length) {
        injector.parse(config.providers);
    }

    if (!baseURL && config.baseURL) {
        ctx.baseURL = config.baseURL;
    }

    config = { ...config, ...ctx.reflect.annotation };
    ctx.setValue(CONFIGURATION, config);
    injector.setValue(CONFIGURATION, config);

    await next();
};

export class RegisterModuleScope extends BuildHandles<IAnnoationContext> implements IActionSetup {

    async execute(ctx: IBootContext, next?: () => Promise<void>): Promise<void> {
        if (!ctx.type) {
            return;
        }
        if (isPrimitiveType(ctx.type)) {
            return;
        }
        // has module register or not.
        if (!ctx.state().isRegistered(ctx.type)) {
            await super.execute(ctx);
        }
        if (next) {
            await next();
        }
    }
    setup() {
        this.use(RegisterAnnoationHandle);
    }
};

export const RegisterAnnoationHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    const state = ctx.state();
    if (!state.isRegistered(ctx.type)) {
        if (refl.get<AnnotationReflect>(ctx.type, true)?.annoType === 'module') {
            ctx.injector.register({ useClass: ctx.type, regIn: 'root' });
        } else {
            ctx.injector.register(ctx.type);
        }
    }
    const annoation = ctx.getAnnoation();
    ctx.setInjector(state.getInjector(ctx.type));
    if (annoation) {
        if (annoation.baseURL) {
            ctx.baseURL = annoation.baseURL;
        }
        next();
    } else {
        throw new Error(`boot type [${lang.getClassName(ctx.type)}] is not vaild annoation class.`);
    }
};

/**
 * boot configure register handle.
 *
 * @export
 */
export const BootConfigureRegisterHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    const config = ctx.getConfiguration();
    const container = ctx.getContainer();
    if (config.logConfig && !container.has(LogConfigureToken)) {
        container.setValue(LogConfigureToken, config.logConfig);
    }
    if (config.debug) {
        // make sure log module registered.
        ctx.injector.register(LogModule)
            .register(DebugLogAspect);
    }

    const regs = ctx.injector.getServices(ConfigureRegister);
    if (regs && regs.length) {
        await Promise.all(regs.map(reg => reg.register(config, ctx)));

    }
    await next();
};


export const ResolveTypeHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    if (ctx.type) {
        ctx.target = await ctx.injector.resolve(ctx.type, ctx.providers);
    }
    await next();
};

export const ResolveBootHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    if (ctx.bootToken) {
        ctx.boot = ctx.bootstrap(ctx.bootToken);
        if (ctx.boot instanceof Runnable) {
            await ctx.boot.configureService(ctx);
        }
    }
    await next();
};

/**
 * configure startup service scope.
 */
export class StartupGlobalService extends BuildHandles<IBootContext> implements IActionSetup {

    async execute(ctx: IBootContext, next: () => Promise<void>): Promise<void> {
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
export const ConfigureServiceHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    const startups = ctx.getStarupTokens() || [];
    const { injector: root, providers } = ctx;
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

    const starts = root.get(STARTUPS) || [];
    if (starts.length) {
        await lang.step(starts.map(tyser => () => {
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
            sers.push(getFacInstance(pdrs, pdr, providers));
        }
    });
    if (sers && sers.length) {
        await Promise.all(sers.map(ser => {
            ctx.onDestroy(() => ser?.destroy());
            startups.push(lang.getClass(ser));
            return ser.configureService(ctx);
        }));
    }

    ctx.setValue(MODULE_STARTUPS, startups);
    await next();
};
