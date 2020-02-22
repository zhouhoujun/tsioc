import {
    Type, createRaiseContext, IocProvidersOption, IocProvidersContext,
    isToken, ClassType, RegInMetadata, lang, tokenId, CTX_TARGET_RELF, Token, IProviders, IIocContext, isDefined
} from '@tsdi/ioc';
import { IContainer, ICoreInjector } from '@tsdi/core';
import { CTX_MODULE_ANNOATION, CTX_MODULE, CTX_MODULE_DECTOR } from './context-tokens';
import { ModuleRef } from './modules/ModuleRef';
import { IAnnotationMetadata, IAnnoationReflect } from './annotations/IAnnoationReflect';

/**
 * annoation action option.
 *
 * @export
 * @interface AnnoationOption
 * @extends {ActionContextOption}
 */
export interface AnnoationOption<T = any> extends IocProvidersOption, RegInMetadata {
    /**
     * target module type.
     *
     * @type {ClassType}
     * @memberof AnnoationActionOption
     */
    type?: ClassType<T>;
    /**
     * target module type.
     *
     * @type {ClassType}
     * @memberof AnnoationActionOption
     */
    module?: ClassType<T>;
    /**
     *  parent context.
     */
    parent?: IAnnoationContext;

}

/**
 * annoation context interface.
 */
export interface IAnnoationContext<T extends AnnoationOption = AnnoationOption> extends IIocContext<T, ICoreInjector> {
    /**
    * current build type.
    */
    readonly type: Type;
    /**
     * current annoation type decorator.
     */
    readonly decorator: string;

    /**
     * get current DI module ref.
     */
    getModuleRef(): ModuleRef;

    getTargetReflect<T extends IAnnoationReflect>(): T;

    getAnnoation<T extends IAnnotationMetadata>(): T;

    readonly providers: IProviders;

    readonly injector: ICoreInjector;

    /**
     * set parent context
     * @param context
     */
    setParent(context: IAnnoationContext): this;

    getParent<T extends IAnnoationContext>(): T;

    addChild(contex: IAnnoationContext);

    removeChild(contex: IAnnoationContext);

    hasChildren(): boolean;

    getChildren<T extends IAnnoationContext>(): T[];
    /**
     * get token providers service route in root contexts.
     * @param token
     * @param success
     */
    getContext<T>(token: Token<T>, success?: (value: T) => void): T
    /**
     * resolve token value route in root contexts.
     * @param token
     * @param success
     */
    getContextValue<T>(token: Token<T>, success?: (value: T) => void): T;

    /**
     * get root container.
     */
    getContainer(): IContainer;

}


export const CTX_PARENT_CONTEXT = tokenId<IAnnoationContext>('CTX_PARENT_CONTEXT');
export const CTX_SUB_CONTEXT = tokenId<IAnnoationContext[]>('CTX_SUB_CONTEXT');
/**
 * annoation context.
 *
 * @export
 * @class AnnoationContext
 * @extends {HandleContext}
 */
export class AnnoationContext<T extends AnnoationOption = AnnoationOption>
    extends IocProvidersContext<T, ICoreInjector> implements IAnnoationContext<T> {

    static parse(injector: ICoreInjector, target: ClassType | AnnoationOption): AnnoationContext {
        return createRaiseContext(injector, AnnoationContext, isToken(target) ? { type: target } : target);
    }

    get type(): Type {
        return this.context.getValue(CTX_MODULE);
    }

    /**
     * current annoation type decorator.
     *
     * @readonly
     * @type {string}
     * @memberof AnnoationContext
     */
    get decorator(): string {
        return this.context.getValue(CTX_MODULE_DECTOR) ?? this.getDecorator();
    }

    protected getDecorator() {
        let dec = this.type ? this.getTargetReflect()?.decorator : null;
        dec && this.setValue(CTX_MODULE_DECTOR, dec);
        return dec;
    }

    getModuleRef(): ModuleRef {
        return this.injector.getSingleton(ModuleRef);
    }

    getTargetReflect<T extends IAnnoationReflect>(): T {
        return this.context.getValue<T>(CTX_TARGET_RELF) ?? this.getParentTargetReflect();
    }

    protected getParentTargetReflect<T extends IAnnoationReflect>(): T {
        let refl = this.type ? this.reflects.get(this.type) : null;
        refl && this.setValue(CTX_TARGET_RELF, refl);
        return refl as T;
    }

    /**
     * get token providers service route in root contexts.
     * @param token
     */
    getContext<T>(token: Token<T>, success?: (value: T) => void): T {
        let key = this.injector.getTokenKey(token);
        let value = this.getInstance(key);
        if (isDefined(value)) {
            success && success(value);
            return value;
        }
        let ctx = this.getParent() as IAnnoationContext;
        while (ctx && !ctx.destroyed) {
            value = ctx.getInstance(key);
            if (isDefined(value)) {
                success && success(value);
                break;
            }
            ctx = ctx.getParent();
        }
        return value ?? null;
    }

    /**
     * resolve token route in root contexts.
     * @param token
     */
    getContextValue<T>(token: Token<T>, success?: (value: T) => void): T {
        if (this.destroyed) {
            return null;
        }
        let key = this.injector.getTokenKey(token);
        let value = this.context.getValue(key);
        if (isDefined(value)) {
            success && success(value);
            return value;
        }
        let ctx = this.getParent() as IAnnoationContext;
        while (ctx && !ctx.destroyed) {
            value = ctx.context.getValue(key);
            if (isDefined(value)) {
                success && success(value);
                break;
            }
            ctx = ctx.getParent();
        }
        return value ?? null;
    }

    getContainer(): IContainer {
        return super.getContainer() as IContainer;
    }

    setParent(context: IAnnoationContext): this {
        if (context === null) {
            this.remove(CTX_PARENT_CONTEXT);
        } else {
            this.setValue(CTX_PARENT_CONTEXT, context);
        }
        return this;
    }

    getParent<T extends IAnnoationContext>(): T {
        return this.context.getValue(CTX_PARENT_CONTEXT) as T;
    }

    addChild(contex: IAnnoationContext) {
        let chiledren = this.getChildren();
        chiledren.push(contex);
        this.setValue(CTX_SUB_CONTEXT, chiledren);
    }

    removeChild(contex: IAnnoationContext) {
        let chiledren = this.getChildren();
        if (chiledren) {
            return lang.remove(chiledren, contex);
        }
        return [];
    }

    hasChildren() {
        return this.hasValue(CTX_SUB_CONTEXT);
    }

    getChildren<T extends IAnnoationContext>(): T[] {
        return (this.context.getValue(CTX_SUB_CONTEXT) || []) as T[];
    }


    /**
     * annoation metadata.
     *
     * @type {ModuleConfigure}
     * @memberof AnnoationContext
     */
    getAnnoation<T extends IAnnotationMetadata>(): T {
        return this.context.getValue<T>(CTX_MODULE_ANNOATION) ?? this.getReflAnnoation();
    }

    protected getReflAnnoation<T extends IAnnotationMetadata>(): T  {
        let anno = this.type ? this.getTargetReflect()?.getAnnoation?.<T>() : null;
        anno && this.setValue(CTX_MODULE_ANNOATION, anno);
        return anno;
    }


    setOptions(options: T) {
        if (!options) {
            return this;
        }
        options.type = options.type || options.module;
        if (options.type) {
            this.setValue(CTX_MODULE, options.type);
        }
        if (options.parent instanceof AnnoationContext) {
            this.setParent(options.parent);
        }
        return super.setOptions(options);
    }
}
