import { INJECTOR, lang, isPrimitiveType, IActionSetup, Abstract, ClassType, refl, isProvide, isFunction, getFacInstance, Type } from '@tsdi/ioc';
import { LogConfigureToken, DebugLogAspect, LogModule } from '@tsdi/logs';
import { IAnnoationContext, IBootContext } from '../Context';
import { PROCESS_ROOT, BUILDER, BOOTCONTEXT, CONFIGURATION, MODULE_RUNNABLE, MODULE_STARTUPS } from '../tk';
import { ConfigureManager } from '../configure/manager';
import { ConfigureRegister } from '../configure/register';
import { BuildHandles, BuildHandle } from '../builder/handles';
import { StartupService, STARTUPS, IStartupService } from '../services/StartupService';
import { Runnable } from '../runnable/Runnable';
import { AnnotationReflect } from '../annotations/reflect';

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
        await ctx.injector.load(...ctx.deps);
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
    const injector = ctx.injector;
    if (ctx.type) {
        if (ctx.hasValue(PROCESS_ROOT)) {
            injector.setValue(PROCESS_ROOT, ctx.baseURL)
        }
    }
    const mgr = injector.getInstance(ConfigureManager);
    if (options.configures && options.configures.length) {
        options.configures.forEach(config => {
            mgr.useConfiguration(config);
        });
    } else {
        // load default config.
        mgr.useConfiguration();
    }
    const config = await mgr.getConfig();
    ctx.setValue(CONFIGURATION, { ...config, ...ctx.reflect.annotation });

    if (config.deps && config.deps.length) {
        injector.load(...config.deps);
    }

    if (config.providers && config.providers.length) {
        injector.inject(...config.providers);
    }

    if (config.baseURL) {
        ctx.setValue(PROCESS_ROOT, config.baseURL);
        injector.setValue(PROCESS_ROOT, config.baseURL);
    }

    await next();
};

export class RegisterModuleScope extends BuildHandles<IAnnoationContext> implements IActionSetup {

    async execute(ctx: IBootContext, next?: () => Promise<void>): Promise<void> {
        if (!ctx.type) {
            if (ctx.template && next) {
                return await next();
            }
            return;
        }
        if (isPrimitiveType(ctx.type)) {
            return;
        }
        // has module register or not.
        if (!ctx.getContainer().regedState.isRegistered(ctx.type)) {
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
    const regedState = ctx.getContainer().regedState;
    if (!regedState.isRegistered(ctx.type)) {
        if (refl.get<AnnotationReflect>(ctx.type, true)?.annoType === 'module') {
            ctx.injector.register({ useClass: ctx.type, regIn: 'root' });
        } else {
            ctx.injector.register(ctx.type);
        }
    }
    const annoation = ctx.getAnnoation();
    ctx.setValue(INJECTOR, regedState.getInjector(ctx.type));
    if (annoation) {
        if (annoation.baseURL) {
            ctx.baseURL = annoation.baseURL;
            ctx.injector.setValue(PROCESS_ROOT, annoation.baseURL);
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
        ctx.target = await ctx.injector.getInstance(BUILDER).resolve({
            type: ctx.type,
            // parent: ctx,
            providers: ctx.providers
        });
    }
    await next();
};

export const ResolveBootHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    const bootModule = ctx.bootstrap || ctx.getAnnoation()?.bootstrap;
    if (!ctx.boot && (ctx.template || bootModule)) {
        ctx.providers.inject(
            { provide: BOOTCONTEXT, useValue: ctx },
            { provide: lang.getClass(ctx), useValue: ctx }
        )
        let injector = ctx.injector;
        let boot = await injector.getInstance(BUILDER).resolve({
            type: isProvide(bootModule) ? injector.getTokenProvider(bootModule) : bootModule,
            // parent: ctx,
            template: ctx.template,
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
    const { injector, providers } = ctx;
    const regedState = ctx.getContainer().regedState;
    if (startups.length) {
        await lang.step(startups.map(tyser => () => {
            let ser: IStartupService;
            if (isFunction(tyser) && !regedState.isRegistered(tyser)) {
                injector.register(tyser as Type);
            }
            ser = injector.get(tyser) ?? regedState.getInstance(tyser as ClassType);
            ctx.onDestroy(() => ser?.destroy());
            return ser?.configureService(ctx);
        }));
    }

    const starts = injector.get(STARTUPS) || [];
    if (starts.length) {
        await lang.step(starts.map(tyser => () => {
            const ser = injector.get(tyser) ?? regedState.getInstance(tyser);
            ctx.onDestroy(() => ser?.destroy());
            startups.push(tyser);
            return ser.configureService(ctx);
        }));
    }

    const sers: StartupService[] = [];
    const prds = injector.getServiceProviders(StartupService);
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
        startup = ctx.injector.getService(
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

