import { ICoreInjector } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { BootContext, BootOption, BuildContext, BuildOption } from './Context';



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

// function getValue<T>(this: AnnoationContext, token: Token<T>): T {
//     return this.context.getValue(token);
// }

// function getOptions(this: AnnoationContext) {
//     return this.getValue()
// }

// function getContainer(this: AnnoationContext): IContainer {
//     return this.injector.getContainer();
// }

// export function createContext<TOP extends AnnoationOption>(option: TOP, injector: ICoreInjector): AnnoationContext {
//     const opt = { ...option };
//     const context = injector.get(PROVIDERS).inject(...isArray(opt.contexts) ? opt.contexts || [] : [opt.contexts]);
//     const providers = injector.get(PROVIDERS).inject(...isArray(opt.providers) ? opt.providers || [] : [opt.providers]);
//     const reflect = opt.type ? refl.getIfy(opt.type) : null;
//     const descb = [];
//     let destroyed = false;
//     const ctx = {
//         injector,
//         context,
//         providers,
//         reflect,
//         type: opt.type,
//         getOptions() {
//             return opt;
//         },
//         has(token: Token) {
//             return context.has(token);
//         },
//         hasValue(token: Token): boolean {
//             return context.hasValue(token);
//         },
//         remove(...tokens: Token[]) {
//             tokens.forEach(tk => context.delValue(tk));
//         },
//         get<T>(token: Token<T>): T {
//             return context.get(token);
//         },
//         getValue<T>(token: Token<T>): T {
//             return context.getValue(token);
//         },
//         setValue<T>(token: Token<T>, value: T): Tctx {
//             context.setValue(token, value);
//             return ctx as Tctx;
//         },
//         set(...providers: any[]) {
//             if (providers.length === 2 && isToken(providers[0])) {
//                 let provde = providers[0];
//                 let value = providers[1];
//                 context.setValue(provde, value);
//             } else {
//                 context.inject(...providers);
//             }
//             return this;
//         },
//         getContainer(): IContainer {
//             return injector.getContainer();
//         },
//         clone: (options: BootOption) => {
//             if (options) {
//                 return createContext({ ...opt, ...options }, injector);
//             } else {
//                 return createContext({ ...opt }, injector);
//             }
//         },
//         onDestroy(callback: () => void): void {
//             descb.push(callback);
//         },
//         destroy() {
//             if (destroyed) {
//                 return;
//             }
//             descb.forEach(cb => isFunction(cb) && cb());
//             ctx.providers.destroy();
//             context.destroy();

//             lang.cleanObj(ctx);
//             destroyed = true;
//         }
//     } as AnnoationContext;

//     return ctx;
// }

// @Injectable()
// export class DefaultBuildContextFactory extends BuildContextFactory {
//     create(option: BuildOption, injector: ICoreInjector): BuildContext {
//         const { template } = option;
//         return {
//             ...createContext(option, injector),
//             template
//         } as BootContext;
//     }
// }


// function getStarupTokens(this: BootContext) {
//     return this.getValue(MODULE_STARTUP);
// }

// function getConfiguration(this: BootContext) {
//     return this.getValue(CONFIGURATION);
// }

// function getConfigureManager(this: BootContext): IConfigureManager<Configure> {
//     return this.injector.resolve(ConfigureMgrToken);
// }

// @Injectable()
// export class DefaultBootContextFactory extends BootContextFactory {
//     create(option: BootOption, injector: ICoreInjector): BootContext {
//         const { args, data, autorun, deps, template, bootstrap } = option;
//         const bootCtx = {
//             ...createContext(option, injector),
//             args,
//             data,
//             autorun,
//             deps,
//             template,
//             bootstrap,
//         };
//         Object.defineProperties(bootCtx, {
//             getStarupTokens: {
//                 value: getStarupTokens,
//                 writable: false,
//                 enumerable: false
//             },
//             getConfiguration: {
//                 value: getConfiguration,
//                 writable: false,
//                 enumerable: false
//             },
//             getConfigureManager: {
//                 value: getConfigureManager,
//                 writable: false,
//                 enumerable: false
//             }
//         });
//         return bootCtx as BootContext;
//     }

// }
