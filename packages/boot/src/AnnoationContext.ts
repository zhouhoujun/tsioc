import {
    Type, createRaiseContext, IocProvidersOption, IocProvidersContext,
    isToken, ClassType, RegInMetadata, lang, tokenId, CTX_TARGET_RELF, Token, isNullOrUndefined, ITypeReflects, IProviders, IIocContext
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
export interface IAnnoationContext<T extends AnnoationOption = AnnoationOption,
TMeta extends IAnnotationMetadata = IAnnotationMetadata,
TRefl extends IAnnoationReflect = IAnnoationReflect> extends IIocContext<T, ICoreInjector, IContainer> {
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

    readonly targetReflect?: TRefl;

    readonly annoation: TMeta;

    readonly providers: IProviders;

    readonly injector: ICoreInjector;

    /**
     * set parent context
     * @param context
     */
    setParent(context: IAnnoationContext): this;

    getParent(): IAnnoationContext;

    addChild(contex: IAnnoationContext);

    removeChild(contex: IAnnoationContext);

    hasChildren(): boolean;

    getChildren<T extends IAnnoationContext>(): T[];

    /**
     * resolve token route in root contexts.
     * @param token
     */
    resolve<T>(token: Token<T>): T
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
export class AnnoationContext<T extends AnnoationOption = AnnoationOption,
    TMeta extends IAnnotationMetadata = IAnnotationMetadata,
    TRefl extends IAnnoationReflect = IAnnoationReflect>
    extends IocProvidersContext<T, ICoreInjector, IContainer> implements IAnnoationContext<T, TMeta, TRefl> {

    static parse(injector: ICoreInjector, target: ClassType | AnnoationOption): AnnoationContext {
        return createRaiseContext(injector, AnnoationContext, isToken(target) ? { type: target } : target);
    }

    get type(): Type {
        return this.getValue(CTX_MODULE);
    }

    /**
     * current annoation type decorator.
     *
     * @readonly
     * @type {string}
     * @memberof AnnoationContext
     */
    get decorator(): string {
        if (!this.hasValue(CTX_MODULE_DECTOR) && this.type) {
            let dec = this.targetReflect?.decorator;
            if (dec) {
                this.setValue(CTX_MODULE_DECTOR, dec);
            }
        }
        return this.getValue(CTX_MODULE_DECTOR);
    }

    getModuleRef(): ModuleRef {
        return this.injector.getSingleton(ModuleRef);
    }

    get targetReflect(): TRefl {
        if (!this.hasValue(CTX_TARGET_RELF) && this.type) {
            let refls = this.reflects.get(this.type);
            refls && this.setValue(CTX_TARGET_RELF, refls);
        }
        return this.getValue(CTX_TARGET_RELF) as TRefl;
    }

    /**
     * resolve token route in root contexts.
     * @param token
     */
    resolve<T>(token: Token<T>): T {
        let value: T;
        let key = this.injector.getTokenKey(token);
        let ctx = this as IAnnoationContext;
        while (ctx && isNullOrUndefined(value)) {
            value = ctx.getValue(key);
            ctx = ctx.getParent();
        }
        return value ?? null;
    }

    setParent(context: IAnnoationContext): this {
        if (context === null) {
            this.remove(CTX_PARENT_CONTEXT);
        } else {
            this.setValue(CTX_PARENT_CONTEXT, context);
        }
        return this;
    }

    getParent(): IAnnoationContext {
        return this.getValue(CTX_PARENT_CONTEXT);
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
        return (this.getValue(CTX_SUB_CONTEXT) || []) as T[];
    }


    /**
     * annoation metadata.
     *
     * @type {ModuleConfigure}
     * @memberof AnnoationContext
     */
    get annoation(): TMeta {
        if (!this.hasValue(CTX_MODULE_ANNOATION) && this.type) {
            let tgRef = this.targetReflect;
            if ((tgRef && tgRef.getAnnoation)) {
                this.setValue(CTX_MODULE_ANNOATION, tgRef.getAnnoation<TMeta>())
            }
        }
        return this.getValue(CTX_MODULE_ANNOATION) as TMeta;
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
