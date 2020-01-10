import {
    Type, createRaiseContext, IocProvidersOption, IocProvidersContext,
    isToken, ClassType, RegInMetadata, ClassMetadata, InjectToken, lang
} from '@tsdi/ioc';
import { IContainer, ICoreInjector } from '@tsdi/core';
import { CTX_MODULE_DECTOR, CTX_MODULE_ANNOATION } from './context-tokens';
import { ModuleConfigure } from './modules/ModuleConfigure';
import { IModuleReflect } from './modules/IModuleReflect';

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
     * module decorator.
     *
     * @type {string}
     * @memberof AnnoationActionOption
     */
    decorator?: string;
    /**
     * annoation metadata config.
     *
     * @type {IAnnotationMetadata}
     * @memberof AnnoationOption
     */
    annoation?: ClassMetadata;

    /**
     *  parent context.
     */
    parent?: AnnoationContext;
}


export const CTX_PARENT_CONTEXT = new InjectToken<AnnoationContext>('CTX_PARENT_CONTEXT');
export const CTX_SUB_CONTEXT = new InjectToken<AnnoationContext[]>('CTX_SUB_CONTEXT');
/**
 * annoation context.
 *
 * @export
 * @class AnnoationContext
 * @extends {HandleContext}
 */
export class AnnoationContext<T extends AnnoationOption = AnnoationOption, TMeta extends ModuleConfigure = ModuleConfigure> extends IocProvidersContext<T, ICoreInjector, IContainer> {

    static parse(injector: ICoreInjector, target: ClassType | AnnoationOption): AnnoationContext {
        return createRaiseContext(injector, AnnoationContext, isToken(target) ? { type: target } : target);
    }

    get type(): Type {
        return this.injector.getTokenProvider(this.getOptions().type);
    }

    get decorator(): string {
        if (!this.has(CTX_MODULE_DECTOR) && this.type) {
            let dec = this.targetReflect.decorator;
            if (dec) {
                this.set(CTX_MODULE_DECTOR, dec);
            }
        }
        return this.get(CTX_MODULE_DECTOR);
    }

    private _targetReflect: IModuleReflect;
    get targetReflect(): IModuleReflect {
        if (!this._targetReflect && this.type) {
            this._targetReflect = this.reflects.get(this.type);
        }
        return this._targetReflect;
    }


    setParent(context: AnnoationContext): this {
        this.set(CTX_PARENT_CONTEXT, context);
        return this;
    }

    getParent() {
        return this.get(CTX_PARENT_CONTEXT);
    }

    addChild(contex: AnnoationContext) {
        let chiledren = this.getChildren();
        chiledren.push(contex);
        this.set(CTX_SUB_CONTEXT, chiledren);
    }

    removeChild(contex: AnnoationContext) {
        let chiledren = this.getChildren();
        if (chiledren) {
            return lang.remove(chiledren, contex);
        }
        return [];
    }

    hasChildren() {
        return this.has(CTX_SUB_CONTEXT);
    }

    getChildren() {
        return this.get(CTX_SUB_CONTEXT) || [];
    }


    /**
     * annoation metadata.
     *
     * @type {ModuleConfigure}
     * @memberof AnnoationContext
     */
    get annoation(): TMeta {
        if (!this.has(CTX_MODULE_ANNOATION) && this.type) {
            let tgRef = this.targetReflect;
            if ((tgRef && tgRef.getAnnoation)) {
                this.set(CTX_MODULE_ANNOATION, tgRef.getAnnoation<TMeta>())
            }
        }
        return this.get(CTX_MODULE_ANNOATION) as TMeta;
    }


    setOptions(options: T) {
        if (!options) {
            return;
        }
        options.type = options.type || options.module;
        super.setOptions(options);
        if (options.parent instanceof AnnoationContext) {
            this.setParent(options.parent);
        }
        if (options.decorator) {
            this.set(CTX_MODULE_DECTOR, options.decorator);
        }
        if (options.annoation) {
            this.set(CTX_MODULE_ANNOATION, options.annoation);
        }
    }
}
