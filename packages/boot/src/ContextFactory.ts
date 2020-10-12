import { IContainer, ICoreInjector } from '@tsdi/core';
import { Abstract, Injectable, isArray, isBoolean, isFunction, isProvider, isToken, lang, PROVIDERS, refl, SymbolType, Token } from '@tsdi/ioc';
import { Configure } from './configure/Configure';
import { IConfigureManager } from './configure/IConfigureManager';
import { ConfigureManager } from './configure/manager';
import { AnnoationContext, AnnoationOption, BootContext, BootOption, BuildContext, BuildOption } from './Context';
import { IStartup } from './runnable/Startup';
import { CONFIGURATION, ConfigureMgrToken } from './tk';


/**
 * context factory.
 */
@Abstract()
export abstract class BuildContextFactory {

    constructor() {

    }

    /**
     * create context via option.
     * @param option
     * @param injector
     */
    abstract create(option: BuildOption, injector: ICoreInjector): BuildContext;
}


@Abstract()
export abstract class BootContextFactory {
    constructor() {

    }

    /**
     * create context via option.
     * @param option
     * @param injector
     */
    abstract create(option: BootOption, injector: ICoreInjector): BootContext;
}

export function createContext<TOP extends AnnoationOption, Tctx extends AnnoationContext>(option: TOP, injector: ICoreInjector, append?: (ctx: Tctx) => Tctx): Tctx {
    const opt = { ...option };
    const context = injector.get(PROVIDERS).inject(...isArray(opt.contexts) ? opt.contexts || [] : [opt.contexts]);
    const providers = injector.get(PROVIDERS).inject(...isArray(opt.providers) ? opt.providers || [] : [opt.providers]);
    const reflect = opt.type ? refl.getIfy(opt.type) : null;
    const descb = [];
    let destroyed = false;
    const ctx = {
        injector,
        providers,
        reflect,
        type: opt.type,
        getOptions() {
            return opt;
        },
        has(token: Token) {
            return context.has(token);
        },
        hasValue(token: Token): boolean {
            return context.hasValue(token);
        },
        remove(...tokens: Token[]) {
            tokens.forEach(tk => context.delValue(tk));
        },
        get<T>(token: Token<T>): T {
            return context.get(token);
        },
        getValue<T>(token: Token<T>): T {
            return context.getValue(token);
        },
        setValue<T>(token: Token<T>, value: T): Tctx {
            context.setValue(token, value)
            return ctx as Tctx;
        },
        set(...providers: any[]) {
            if (providers.length === 2 && isToken(providers[0])) {
                let provde = providers[0];
                let value = providers[1];
                context.setValue(provde, value);
            } else {
                context.inject(...providers);
            }
            return this;
        },
        getContainer(): IContainer {
            return injector.getContainer();
        },
        clone: (options: BootOption) => {
            if (options) {
                return createContext({ ...opt, ...options }, injector);
            } else {
                return createContext({ ...opt }, injector);
            }
        },
        onDestroy(callback: () => void): void {
            descb.push(callback);
        },
        destroy() {
            if (destroyed) {
                return;
            }
            descb.forEach(cb => isFunction(cb) && cb());
            ctx.providers.destroy();
            context.destroy();

            lang.cleanObj(ctx);
            destroyed = true;
        }
    } as AnnoationContext;

    if (append) {
        return append(ctx as Tctx);
    }
    return ctx as Tctx;
}

@Injectable()
export class DefaultBuildContextFactory extends BuildContextFactory {
    create(option: BuildOption, injector: ICoreInjector): BuildContext {
        return createContext(option, injector);
    }
}


@Injectable()
export class DefaultBootContextFactory extends BootContextFactory {
    create(option: BootOption, injector: ICoreInjector): BootContext {
        const { args, data, autorun, deps, template, bootstrap } = option;
        return createContext(option, injector, ctx => {
            const bootCtx = {
                ...ctx,
                args,
                data,
                autorun,
                deps,
                template,
                bootstrap,
                getConfiguration: () => {
                    return bootCtx.getValue(CONFIGURATION)
                },
                getConfigureManager(): IConfigureManager<Configure> {
                    return bootCtx.injector.resolve(ConfigureMgrToken);
                }
            };
            return bootCtx;
        });
    }

}
