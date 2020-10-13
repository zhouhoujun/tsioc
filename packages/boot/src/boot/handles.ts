import { isClass, INJECTOR, lang, isBaseType, IActionSetup, Abstract, ClassType, PromiseUtil } from '@tsdi/ioc';
import { LogConfigureToken, DebugLogAspect } from '@tsdi/logs';
import { AnnoationContext, BootContext } from '../Context';
import {
    ProcessRunRootToken, BuilderServiceToken, BOOTCONTEXT, CONFIGURATION, MODULE_STARTUP
} from '../tk';
import { ConfigureManager } from '../configure/manager';
import { ConfigureRegister } from '../configure/register';
import { BuildHandles, BuildHandle } from '../builder/handles';
import { StartupService, STARTUPS, IStartupService } from '../services/StartupService';
import { Startup } from '../runnable/Startup';
import { Runnable } from '../runnable/Runnable';
import { Service } from '../runnable/Service';

/**
 * annoation handle.
 *
 * @export
 * @abstract
 * @class BootHandle
 * @extends {BuildHandle<BootContext>}
 */
@Abstract()
export abstract class BootHandle extends BuildHandle<BootContext> {
    /**
     * execute boot Handle.
     *
     * @abstract
     * @param {AnnoationContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof BootHandle
     */
    abstract execute(ctx: BootContext, next: () => Promise<void>): Promise<void>;
}

export class RegBootEnvScope extends BuildHandles<BootContext> implements IActionSetup {

    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        await super.execute(ctx);
        if (next) {
            await next();
        }
    }

    setup() {
        this.use(BootDepsHandle)
            .use(BootProvidersHandle)
            .use(BootConfigureLoadHandle);
    }
}

/**
 * boot deps handle.
 *
 * @export
 */
export const BootDepsHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
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
export const BootProvidersHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
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
export const BootConfigureLoadHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {

    const options = ctx.getOptions();
    const injector = ctx.injector;
    if (isClass(ctx.type)) {
        if (ctx.hasValue(ProcessRunRootToken)) {
            injector.setValue(ProcessRunRootToken, ctx.baseURL)
        }
    }
    let mgr = injector.getInstance(ConfigureManager);
    if (options.configures && options.configures.length) {
        options.configures.forEach(config => {
            mgr.useConfiguration(config);
        });
    } else {
        // load default config.
        mgr.useConfiguration();
    }
    let config = await mgr.getConfig();
    let annoation = ctx.reflect.moduleMetadata;
    ctx.setValue(CONFIGURATION, {...config, ...annoation});

    if (config.deps && config.deps.length) {
        injector.load(...config.deps);
    }

    if (config.providers && config.providers.length) {
        injector.inject(...config.providers);
    }

    if (config.baseURL) {
        ctx.setValue(ProcessRunRootToken, config.baseURL);
        injector.setValue(ProcessRunRootToken, config.baseURL);
    }

    await next();
};

export class RegisterModuleScope extends BuildHandles<AnnoationContext> implements IActionSetup {

    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        if (!ctx.type) {
            if (ctx.template && next) {
                return await next();
            }
            return;
        }
        if (isBaseType(ctx.type)) {
            return;
        }
        // has module register or not.
        if (!ctx.getContainer().isRegistered(ctx.type)) {
            await super.execute(ctx);
        } else if (next) {
            await next();
        }
    }
    setup() {
        this.use(RegisterAnnoationHandle);
    }
};

export const RegisterAnnoationHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    const container = ctx.getContainer();
    if (!container.isRegistered(ctx.type)) {
        ctx.injector.registerType(ctx.type);
    }
    let reflect = ctx.reflect;
    let annoation = reflect.moduleMetadata;
    ctx.setValue(INJECTOR, container.getInjector(ctx.type));
    if (annoation) {
        if (annoation.baseURL) {
            ctx.baseURL = annoation.baseURL;
            ctx.injector.setValue(ProcessRunRootToken, annoation.baseURL);
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
export const BootConfigureRegisterHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let config = ctx.getConfiguration();
    let container = ctx.getContainer();
    if (config.logConfig && !container.has(LogConfigureToken)) {
        container.setValue(LogConfigureToken, config.logConfig);
    }
    if (config.debug) {
        ctx.injector.register(DebugLogAspect);
    }
    let regs = ctx.injector.getServices(ConfigureRegister);
    if (regs && regs.length) {
        await Promise.all(regs.map(reg => reg.register(config, ctx)));

    }
    await next();
};

/**
 * build boot module.
 */
export class ModuleBuildScope extends BuildHandles<BootContext> implements IActionSetup {

    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
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
        this.use(ResolveTypeHandle)
            .use(ResolveBootHandle);
    }
}

export const ResolveTypeHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    if (ctx.type && !ctx.target) {
        let injector = ctx.injector;
        let target = await injector.getInstance(BuilderServiceToken).resolve({
            type: ctx.type,
            // parent: ctx,
            providers: ctx.providers
        });
        ctx.target = target;
    }
    await next();
};

export const ResolveBootHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let bootModule = ctx.bootstrap || ctx.reflect.moduleMetadata?.bootstrap;
    let template = ctx.template;
    if (!ctx.boot && (template || bootModule)) {
        ctx.providers.inject(
            { provide: BOOTCONTEXT, useValue: ctx },
            { provide: lang.getClass(ctx), useValue: ctx }
        )
        let injector = ctx.injector;
        let boot = await injector.getInstance(BuilderServiceToken).resolve({
            type: injector.getTokenProvider(bootModule),
            // parent: ctx,
            template: template,
            providers: ctx.providers
        });

        ctx.boot = boot;

    }
    await next();
};

/**
 * configure startup service scope.
 */
export class StatupServiceScope extends BuildHandles<BootContext> implements IActionSetup {

    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
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
export const ConfigureServiceHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let startups = ctx.getStarupTokens() || [];
    const injector = ctx.injector;
    const container = injector.getContainer();
    if (startups.length) {
        await PromiseUtil.step(startups.map(tyser => () => {
            let ser: IStartupService;
            if (isClass(tyser) && !container.isRegistered(tyser)) {
                injector.register(tyser);

            }
            ser = injector.get(tyser) ?? container.getInjector(tyser as ClassType)?.get(tyser);
            ctx.onDestroy(() => ser?.destroy());
            return ser?.configureService(ctx);
        }));
    }

    const starts = injector.get(STARTUPS) || [];
    if (starts.length) {
        await PromiseUtil.step(starts.map(tyser => () => {
            const ser = injector.get(tyser) ?? container.getInjector(tyser as ClassType)?.get(tyser);
            ctx.onDestroy(() => ser?.destroy());
            startups.push(tyser);
            return ser.configureService(ctx);
        }));
    }

    let sers: StartupService[] = [];
    const prds = injector.getServiceProviders(StartupService);
    prds.iterator((fac, tk) => {
        if (startups.indexOf(tk) < 0) {
            sers.push(fac(ctx.providers));
        }
    });
    if (sers && sers.length) {
        await Promise.all(sers.map(ser => {
            ctx.onDestroy(() => ser?.destroy());
            startups.push(lang.getClass(ser));
            return ser.configureService(ctx);
        }));
    }

    ctx.getOptions().startups.push(...startups);
    await next();
};


/**
 * resolve main boot instance.
 */
export class ResolveRunnableScope extends BuildHandles<BootContext> implements IActionSetup {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let boot = ctx.boot;
        if (!(boot instanceof Startup)) {
            super.execute(ctx);
        } else if (boot) {
            ctx.boot = boot;
        }

        if (ctx.getStartup()) {
            await next();
        }
    }

    setup() {
        this.use(RefRunnableHandle);
    }
}

/**
 * get ref boot instance.
 * @param ctx boot context
 * @param next next step.
 */
export const RefRunnableHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let startup = ctx.injector.getService(
        { tokens: [Startup, Runnable, Service], target: ctx.boot },
        { provide: BOOTCONTEXT, useValue: ctx },
        { provide: lang.getClass(ctx), useValue: ctx });

    startup && ctx.setValue(MODULE_STARTUP, startup);

    if (!ctx.hasValue(MODULE_STARTUP)) {
        await next();
    }
};

/**
 * statup main boot.
 * @param ctx boot context.
 * @param next next step.
 */
export const StartupBootHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let startup = ctx.getStartup();
    ctx.onDestroy(() => startup?.destroy());
    await startup.configureService(ctx);
    if (ctx.getOptions().autorun !== false) {
        await startup.startup();
    }
    await next();
};
