import {
    isClass, INJECTOR, lang, isBaseType, IActionSetup, PromiseUtil,
    Abstract, Destoryable
} from '@tsdi/ioc';
import { LogConfigureToken } from '@tsdi/logs';
import { IBootContext, BootContext } from '../BootContext';
import { AnnotationMerger } from '../services/AnnotationMerger';
import {
    CTX_APP_CONFIGURE, CTX_MODULE_ANNOATION, CTX_MODULE_INST, CTX_MODULE_BOOT,
    CTX_MODULE_BOOT_TOKEN, CTX_APP_STARTUPS, CTX_MODULE_STARTUP
} from '../context-tokens';
import { ProcessRunRootToken } from '../annotations/RunnableConfigure';
import { ConfigureManager } from '../annotations/ConfigureManager';
import { ConfigureRegister } from '../annotations/ConfigureRegister';
import { BuildHandles, BuildHandle } from '../builder/BuildHandles';
import { IAnnoationContext } from '../AnnoationContext';
import { BuilderServiceToken } from '../services/IBuilderService';
import { StartupService } from '../services/StartupService';
import { Startup } from '../runnable/Startup';
import { Renderer } from '../runnable/Renderer';
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
export abstract class BootHandle extends BuildHandle<IBootContext> {
    /**
     * execute boot Handle.
     *
     * @abstract
     * @param {AnnoationContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof BootHandle
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
export const BootDepsHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    let options = ctx.getOptions();
    if (options.deps && options.deps.length) {
        await ctx.injector.load(...options.deps);
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
    if (isClass(ctx.type)) {
        let baseURL = ctx.baseURL;
        if (baseURL) {
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
    let annoation = ctx.getAnnoation();
    if (annoation) {
        let merger = ctx.getTargetReflect().getDecorProviders?.().getInstance(AnnotationMerger);
        config = merger ? merger.merge([config, annoation]) : Object.assign({}, config, annoation);
    }

    ctx.setValue(CTX_APP_CONFIGURE, config);

    if (config.deps && config.deps.length) {
        injector.load(...config.deps);
    }

    if (config.providers && config.providers.length) {
        injector.inject(...config.providers);
    }

    if (config.baseURL && !ctx.baseURL) {
        ctx.setValue(ProcessRunRootToken, config.baseURL);
        injector.setValue(ProcessRunRootToken, ctx.baseURL);
    }

    await next();
};

export class RegisterModuleScope extends BuildHandles<IAnnoationContext> implements IActionSetup {

    async execute(ctx: IBootContext, next?: () => Promise<void>): Promise<void> {
        if (!(ctx instanceof BootContext)) {
            return;
        }
        if (!ctx.type) {
            if (ctx.getTemplate() && next) {
                return await next();
            }
            return;
        }
        if (isBaseType(ctx.type)) {
            return;
        }
        let annoation = ctx.getAnnoation();
        // has module register or not.
        if (!ctx.reflects.hasRegister(ctx.type)) {
            await super.execute(ctx);
            annoation = ctx.getAnnoation();
            if (annoation) {
                let config = ctx.getConfiguration();
                let merger = ctx.getTargetReflect().getDecorProviders?.().getInstance(AnnotationMerger);
                config = merger ? merger.merge([config, annoation]) : Object.assign({}, config, annoation);
                ctx.setValue(CTX_APP_CONFIGURE, config);
            }
        }
        if (annoation && next) {
            await next();
        }
    }
    setup() {
        this.use(RegisterAnnoationHandle);
    }
};

export const RegisterAnnoationHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    let targetReflect = ctx.getTargetReflect();
    if (!targetReflect || !targetReflect.getInjector) {
        ctx.injector.registerType(ctx.type);
        targetReflect = ctx.getTargetReflect();
    }
    let annoation = targetReflect?.getAnnoation ? targetReflect.getAnnoation() : null;
    ctx.setValue(INJECTOR, targetReflect.getInjector());
    if (annoation) {
        ctx.setValue(CTX_MODULE_ANNOATION, annoation);
        if (annoation.baseURL) {
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
export const BootConfigureRegisterHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    let config = ctx.getConfiguration();
    let regs = ctx.injector.getServices(ConfigureRegister);
    if (regs && regs.length) {
        await Promise.all(regs.map(reg => reg.register(config, ctx)));
        if (config.logConfig && !ctx.injector.has(LogConfigureToken) && !ctx.getContainer().has(LogConfigureToken)) {
            ctx.injector.setValue(LogConfigureToken, config.logConfig);
        }
    }
    await next();
};

/**
 * build boot module.
 */
export class ModuleBuildScope extends BuildHandles<BootContext> implements IActionSetup {

    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        // has build module instance.
        if (!ctx.hasValue(CTX_MODULE_INST) && !ctx.hasValue(CTX_MODULE_BOOT)) {
            await super.execute(ctx);
        }
        if (!ctx.hasValue(CTX_MODULE_BOOT) && ctx.hasValue(CTX_MODULE_INST)) {
            ctx.setValue(CTX_MODULE_BOOT, ctx.target)
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
    if (ctx.type && !ctx.hasValue(CTX_MODULE_INST)) {
        let injector = ctx.injector;
        let target = await injector.getInstance(BuilderServiceToken).resolve({
            type: ctx.type,
            parent: ctx.getParent(),
            providers: ctx.providers
        });
        target && ctx.setValue(CTX_MODULE_INST, target);
    }
    await next();
};

export const ResolveBootHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let bootModule = ctx.getValue(CTX_MODULE_BOOT_TOKEN) || ctx.getAnnoation()?.bootstrap;
    let template = ctx.getTemplate();
    if (!ctx.hasValue(CTX_MODULE_BOOT) && (template || bootModule)) {
        ctx.providers.inject(
            { provide: BootContext, useValue: ctx },
            { provide: lang.getClass(ctx), useValue: ctx }
        )
        let injector = ctx.injector;
        let boot = await injector.getInstance(BuilderServiceToken).resolve({
            type: injector.getTokenProvider(bootModule),
            parent: ctx,
            template: template,
            providers: ctx.providers
        });

        boot && ctx.setValue(CTX_MODULE_BOOT, boot);

    }
    await next();
};

/**
 * configure startup service scope.
 */
export class StatupServiceScope extends BuildHandles<IBootContext> implements IActionSetup {

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
    let startups = ctx.getStarupTokens();
    const injector = ctx.injector;
    const prds = injector.getServiceProviders(StartupService);
    if (startups && startups.length) {
        await PromiseUtil.step(startups.map(c => () => {
            prds.unregister(c);
            let instance: Destoryable = injector.resolve({ token: c, regify: true });
            if (instance instanceof Destoryable) {
                ctx.onDestroy(() => instance?.destroy());
            }
            if (instance instanceof StartupService) {
                return instance.configureService(ctx);
            }
        }));
    } else {
        startups = [];
        ctx.setValue(CTX_APP_STARTUPS, startups);
    }

    let sers: StartupService[] = [];
    prds.iterator((fac) => {
        sers.push(fac(ctx.providers));
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
 * resolve main boot instance.
 */
export class ResolveRunnableScope extends BuildHandles<IBootContext> implements IActionSetup {
    async execute(ctx: IBootContext, next: () => Promise<void>): Promise<void> {
        let boot = ctx.boot;
        if (!(boot instanceof Startup)) {
            super.execute(ctx);
        } else if (boot) {
            ctx.setValue(CTX_MODULE_STARTUP, boot);
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
export const RefRunnableHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    let startup = ctx.injector.getService(
        { tokens: [Startup, Renderer, Runnable, Service], target: ctx.boot },
        { provide: BootContext, useValue: ctx },
        { provide: lang.getClass(ctx), useValue: ctx });

    startup && ctx.setValue(CTX_MODULE_STARTUP, startup);

    if (!ctx.hasValue(CTX_MODULE_STARTUP)) {
        await next();
    }
};

/**
 * statup main boot.
 * @param ctx boot context.
 * @param next next step.
 */
export const StartupBootHandle = async function (ctx: IBootContext, next: () => Promise<void>): Promise<void> {
    let startup = ctx.getStartup();
    ctx.onDestroy(() => startup?.destroy());
    await startup.configureService(ctx);
    if (ctx.getOptions().autorun !== false) {
        await startup.startup();
    }
    await next();
};
