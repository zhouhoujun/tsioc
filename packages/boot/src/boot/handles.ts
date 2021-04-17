import { INJECTOR, lang, isPrimitiveType, IActionSetup, Abstract, ClassType, refl, isProvide, isFunction, getFacInstance, Type } from '@tsdi/ioc';
import { LogConfigureToken, DebugLogAspect, LogModule } from '@tsdi/logs';
import { IAnnoationContext, IBootContext } from '../Context';
import { PROCESS_ROOT, BUILDER, BOOTCONTEXT, CONFIGURATION, MODULE_RUNNABLE, MODULE_STARTUPS, PROCESS_EXIT } from '../tk';
import { ConfigureManager } from '../configure/manager';
import { ConfigureRegister } from '../configure/register';
import { BuildHandles, BuildHandle } from '../builder/handles';
import { StartupService, STARTUPS, IStartupService } from '../services/StartupService';
import { Runnable } from '../runnable/Runnable';
import { AnnotationReflect } from '../annotations/reflect';
import { BootApplication } from '../BootApplication';

/**
 * annoation handle.
 *
 * @export
 * @abstract
 * @class BootHandle
 * @extends {BuildHandle<IBootContext>}
 */
@Abstract()
export abstract class BootHandle extends BuildHandle<IBootContext> {
    /**
     * execute boot Handle.
     *
     * @abstract
     * @param {IAnnoationContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    abstract execute(ctx: IBootContext, next: () => Promise<void>): Promise<void>;
}

export class RegBootEnvScope extends BuildHandles<IBootContext> implements IActionSetup {

    async execute(ctx: IBootContext, next: () => Promise<void>): Promise<void> {
        await super.execute(ctx);
        if (next) {
            await next();
        }
        // after all register application exit events
        const injector = ctx.root;
        const app = ctx.getInstance(BootApplication);
        ctx.onDestroy(() => {
            app.destroy();
        });
        const exit = injector.get(PROCESS_EXIT);
        exit && exit(app);
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
        await ctx.root.load(...ctx.deps);
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
        ctx.root.copy(ctx.providers);
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
    const root = ctx.root;
    if (ctx.type) {
        if (ctx.hasValue(PROCESS_ROOT)) {
            root.setValue(PROCESS_ROOT, ctx.baseURL)
        }
    }
    const mgr = root.getInstance(ConfigureManager);
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
        root.load(...config.deps);
    }

    if (config.providers && config.providers.length) {
        root.inject(...config.providers);
    }

    if (config.baseURL) {
        ctx.setValue(PROCESS_ROOT, config.baseURL);
        root.setValue(PROCESS_ROOT, config.baseURL);
    }

    config = { ...config, ...ctx.reflect.annotation };
    ctx.setValue(CONFIGURATION, config);
    root.setValue(CONFIGURATION, config);

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
            ctx.root.register({ useClass: ctx.type, regIn: 'root' });
        } else {
            ctx.root.register(ctx.type);
        }
    }
    const annoation = ctx.getAnnoation();
    ctx.setRoot(state.getInjector(ctx.type));
    if (annoation) {
        if (annoation.baseURL) {
            ctx.baseURL = annoation.baseURL;
            ctx.root.setValue(PROCESS_ROOT, annoation.baseURL);
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
        ctx.root.register(LogModule)
            .register(DebugLogAspect);
    }

    const regs = ctx.root.getServices(ConfigureRegister);
    if (regs && regs.length) {
        await Promise.all(regs.map(reg => reg.register(config, ctx)));

    }
    await next();
};

/**
 * build boot module.
 */
export class ModuleBuildScope extends BuildHandles<IBootContext> implements IActionSetup {

    async execute(ctx: IBootContext, next?: () => Promise<void>): Promise<void> {
        // has build module instance.
        if (!ctx.target && !ctx.boot) {
            await super.execute(ctx);
        }
        if (!ctx.boot && ctx.target) {
            ctx.boot = ctx.target;
        }
        if (next) {
            await next();
        }
    }

    setup() {
        this.use(ResolveTypeHandle, ResolveBootHandle);
    }
}

export const ResolveTypeHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    if (ctx.type && !ctx.target) {
        ctx.target = await ctx.root.getInstance(BUILDER).build({
            type: ctx.type,
            // parent: ctx,
            providers: ctx.providers
        });
    }
    await next();
};

export const ResolveBootHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    const bootModule = ctx.bootstrap || ctx.getAnnoation()?.bootstrap;
    if (!ctx.boot && bootModule) {
        ctx.providers.inject(
            { provide: BOOTCONTEXT, useValue: ctx },
            { provide: lang.getClass(ctx), useValue: ctx }
        )
        let injector = ctx.root;
        let boot = await injector.getInstance(BUILDER).build({
            type: isProvide(bootModule) ? injector.getTokenProvider(bootModule) : bootModule,
            // parent: ctx,
            providers: ctx.providers
        });
        ctx.boot = boot;
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
    const { root: root, providers } = ctx;
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
    prds.iterator((pdr, tk) => {
        if (startups.indexOf(tk) < 0) {
            sers.push(getFacInstance(pdr, providers));
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


/**
 * resolve main boot instance.
 */
export class StartupBootstrap extends BuildHandles<IBootContext> implements IActionSetup {
    async execute(ctx: IBootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.boot) {
            await super.execute(ctx);
        }
        if (ctx.getStartup()) {
            return await next();
        }
    }

    setup() {
        this.use(RunnableHandle);
    }
}

/**
 * get ref boot instance.
 * @param ctx boot context
 * @param next next step.
 */
export const RunnableHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    let startup: Runnable;
    if (ctx.boot instanceof Runnable) {
        startup = ctx.boot;
    } else {
        startup = ctx.root.getService(
            { tokens: [Runnable], target: ctx.boot },
            { provide: BOOTCONTEXT, useValue: ctx },
            { provide: lang.getClass(ctx), useValue: ctx });
    }

    if (startup) {
        ctx.setValue(MODULE_RUNNABLE, startup);
        ctx.onDestroy(() => startup.destroy());
        await startup.configureService(ctx);
    } else {
        return await next();
    }
};

