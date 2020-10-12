import {
    isToken, ClassType, lang, Token,  INJECTOR, PROVIDERS, refl, TypeReflect,
    IProvider, Destoryable, SymbolType, Provider, isInjector, isArray, isBoolean, Type
} from '@tsdi/ioc';
import { IContainer, ICoreInjector } from '@tsdi/core';
import { AnnoationContext, AnnoationOption } from '../Context';
import { CTX_OPTIONS, CTX_PROVIDERS } from '../tk';


export class AnnoationContextImpl<T extends AnnoationOption, TRefl extends TypeReflect = TypeReflect> extends Destoryable implements AnnoationContext {

    private context: IProvider;
    protected options: T;

    constructor(injector: ICoreInjector, options: T) {
        super();
        this.context = injector.get(PROVIDERS);
        this.setOptions(options);
        this.context.setValue(INJECTOR, injector);
    }

    private _type: Type;
    get type() {
        return this._type;
    }

    private _reflect: TRefl;
    get reflect(): TRefl {
        return this._reflect;
    }

    /**
     * raise injector of this context.
     */
    get injector(): ICoreInjector {
        return this.context.getValue<ICoreInjector>(INJECTOR);
    }

    /**
     * get providers of options.
     */
    get providers(): IProvider {
        return this.context.getValue(CTX_PROVIDERS);
    }

    /**
     * has register in context or not.
     * @param token
     */
    has(token: Token): boolean {
        return this.context.hasRegister(token);
    }

    /**
     * has value in context or not.
     * @param token
     */
    hasValue(token: SymbolType): boolean {
        return this.context.hasValue(token);
    }

    /**
     * remove contexts.
     * @param tokens
     */
    remove(...tokens: SymbolType[]) {
        tokens.forEach(tk => {
            this.context.delValue(tk);
        });
    }
    /**
     * get context provider of boot application.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {T}
     * @memberof BootContext
     */
    get<T>(token: Token<T>): T {
        return this.context.get(token);
    }

    /**
     * get value from context.
     * @param key token key
     */
    getValue<T>(key: Token<T>): T {
        return this.context.getValue(key);
    }

    /**
     * set value to this contet.
     * @param key token key
     * @param value value of key.
     */
    setValue<T>(key: Token<T>, value: T) {
        this.context.setValue(key, value);
        return this;
    }

    /**
     * set provider of this context.
     *
     * @param {Token} token context provider token.
     * @param {*} value context value.
     */
    set(token: Token, value: any);
    /**
     * set context provider of boot application.
     *
     * @param {...Provider[]} providers
     */
    set(...providers: Provider[]);
    set(...providers: any[]) {
        if (providers.length === 2 && isToken(providers[0])) {
            let provde = providers[0];
            let value = providers[1];
            this.context.setValue(provde, value);
        } else {
            this.context.inject(...providers);
        }
        return this;
    }

    /**
     * get root container.
     */
    getContainer(): IContainer {
        return this.injector.getContainer();
    }

    /**
     * set options for context.
     * @param options options.
     */
    protected setOptions(options: T): this {
        if (!options) {
            return;
        }

        if (options.type) {
            this._type = options.type;
            this._reflect = refl.getIfy(this._type);
        }

        if (options.contexts) {
            if (isInjector(options.contexts)) {
                this.context.copy(options.contexts);
            } else if (isArray(options.contexts)) {
                this.context.inject(...options.contexts);
            }
        }
        if (options.providers) {
            if (isInjector(options.providers)) {
                this.setValue(CTX_PROVIDERS, options.providers)
            } else if (isArray(options.providers)) {
                this.providers.inject(...options.providers);
            }
        }
        this.options = lang.omit(options, 'contexts', 'providers', 'injector');
        return this;
    }

    /**
     * get options of context.
     *
     * @returns {T}
     * @memberof IocRaiseContext
     */
    getOptions(): T {
        return this.context.getValue(CTX_OPTIONS) as T;
    }

    clone(): this;
    clone(options: T): this;
    /**
     * clone contexts.
     */
    clone(options?: T | boolean): this {
        const Ctx = lang.getClass(this);
        if (isBoolean(options)) {
            return options ? new Ctx(null, this.injector)
                : new Ctx(this.getOptions(), this.injector);
        } else {
            return new Ctx({ ...this.getOptions(), contexts: this.context.clone(), ...options || {} }, this.injector);
        }
    }

    protected destroying() {
        this.context.destroy();
        this.context = null;
    }
}



// /**
//  * annoation context.
//  *
//  * @export
//  * @class AnnoationContext
//  * @extends {HandleContext}
//  */
// export class AnnoationContext<T extends AnnoationOption = AnnoationOption> extends DestoryableContext<T> implements IAnnoationContext<T> {

//     static parse(injector: ICoreInjector, target: ClassType | AnnoationOption): AnnoationContext {
//         return createContext(injector, AnnoationContext, isToken(target) ? { type: target } : target);
//     }

//     type: Type;

//     /**
//      * current annoation type decorator.
//      *
//      * @readonly
//      * @type {string}
//      * @memberof AnnoationContext
//      */
//     decorator: string;

//     protected getDecorator() {
//         let dec = this.type ? this.getTargetReflect()?.annoDecor : null;
//         dec && this.setValue(CTX_MODULE_DECTOR, dec);
//         return dec;
//     }

//     getModuleRef(): ModuleRef {
//         return this.injector.getValue(ModuleRef);
//     }

//     getTargetReflect(): IAnnoationReflect {
//         return this.context.getValue(CTX_TARGET_RELF) ?? this.getParentTargetReflect();
//     }

//     protected getParentTargetReflect(): IAnnoationReflect {
//         let rft = this.type ? refl.get(this.type) : null;
//         rft && this.setValue(CTX_TARGET_RELF, rft);
//         return rft
//     }

//     // /**
//     //  * get token providers service route in root contexts.
//     //  * @param token
//     //  */
//     // getContext<T>(token: Token<T>, success?: (value: T) => void): T {
//     //     let key = this.injector.getTokenKey(token);
//     //     let value = this.getInstance(key);
//     //     if (isDefined(value)) {
//     //         success && success(value);
//     //         return value;
//     //     }
//     //     let ctx = this.getParent() as IAnnoationContext;
//     //     while (ctx && !ctx.destroyed) {
//     //         value = ctx.getInstance(key);
//     //         if (isDefined(value)) {
//     //             success && success(value);
//     //             break;
//     //         }
//     //         ctx = ctx.getParent();
//     //     }
//     //     return value ?? null;
//     // }

//     // /**
//     //  * resolve token route in root contexts.
//     //  * @param token
//     //  */
//     // getContextValue<T>(token: Token<T>, success?: (value: T) => void): T {
//     //     if (this.destroyed) {
//     //         return null;
//     //     }
//     //     let key = this.injector.getTokenKey(token);
//     //     let value = this.context.getValue(key);
//     //     if (isDefined(value)) {
//     //         success && success(value);
//     //         return value;
//     //     }
//     //     let ctx = this.getParent() as IAnnoationContext;
//     //     while (ctx && !ctx.destroyed) {
//     //         value = ctx.context.getValue(key);
//     //         if (isDefined(value)) {
//     //             success && success(value);
//     //             break;
//     //         }
//     //         ctx = ctx.getParent();
//     //     }
//     //     return value ?? null;
//     // }

//     // setParent(context: IAnnoationContext): this {
//     //     if (context === null) {
//     //         this.remove(CTX_PARENT_CONTEXT);
//     //     } else {
//     //         this.setValue(CTX_PARENT_CONTEXT, context);
//     //     }
//     //     return this;
//     // }

//     // getParent<T extends IAnnoationContext>(): T {
//     //     return this.context.getValue(CTX_PARENT_CONTEXT) as T;
//     // }

//     // addChild(contex: IAnnoationContext) {
//     //     let chiledren = this.getChildren();
//     //     chiledren.push(contex);
//     //     this.setValue(CTX_SUB_CONTEXT, chiledren);
//     // }

//     // removeChild(contex: IAnnoationContext) {
//     //     let chiledren = this.getChildren();
//     //     if (chiledren) {
//     //         return lang.del(chiledren, contex);
//     //     }
//     //     return [];
//     // }

//     // hasChildren() {
//     //     return this.hasValue(CTX_SUB_CONTEXT);
//     // }

//     // getChildren<T extends IAnnoationContext>(): T[] {
//     //     return (this.context.getValue(CTX_SUB_CONTEXT) || []) as T[];
//     // }


//     /**
//      * annoation metadata.
//      *
//      * @type {ModuleConfigure}
//      * @memberof AnnoationContext
//      */
//     getAnnoation(): IAnnotationMetadata {
//         return this.context.getValue(CTX_MODULE_ANNOATION) ?? this.getReflAnnoation();
//     }

//     protected getReflAnnoation(): IAnnotationMetadata {
//         let anno = this.type ? this.getTargetReflect()?.annoMetadata : null;
//         anno && this.setValue(CTX_MODULE_ANNOATION, anno);
//         return anno;
//     }

//     setOptions(options: T) {
//         if (!options) {
//             return this;
//         }
//         options.type = options.type || options.module;
//         if (options.type) {
//             this.setValue(CTX_MODULE, options.type);
//         }
//         if (options.parent instanceof AnnoationContext) {
//             this.setParent(options.parent);
//         }
//         return super.setOptions(options);
//     }

// }
