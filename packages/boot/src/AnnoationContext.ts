import {
    Type, createRaiseContext, IocProvidersOption, IocProvidersContext,
    isToken, ClassType, RegInMetadata, ClassMetadata, InjectToken, lang
} from '@tsdi/ioc';
import { IContainer, ICoreInjector } from '@tsdi/core';
import { CTX_MODULE_ANNOATION, CTX_MODULE, CTX_MODULE_DECTOR } from './context-tokens';
import { ModuleConfigure } from './modules/ModuleConfigure';
import { IModuleReflect } from './modules/IModuleReflect';
import { ModuleRef } from './modules/ModuleRef';

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
        return this.get(CTX_MODULE) ?? this.tryGetCurrType();
    }

    protected tryGetCurrType(): Type {
        return null;
    }

    /**
     * current annoation type decorator.
     *
     * @readonly
     * @type {string}
     * @memberof AnnoationContext
     */
    get decorator(): string {
        if (!this.has(CTX_MODULE_DECTOR) && this.type) {
            let dec = this.targetReflect.decorator;
            if (dec) {
                this.set(CTX_MODULE_DECTOR, dec);
            }
        }
        return this.get(CTX_MODULE_DECTOR);
    }

    getModuleRef(): ModuleRef {
        return this.injector.get(ModuleRef);
    }

    private _targetReflect: IModuleReflect;
    get targetReflect(): IModuleReflect {
        if (!this._targetReflect && this.type) {
            this._targetReflect = this.reflects.get(this.type);
        }
        return this._targetReflect;
    }


    setParent(context: AnnoationContext): this {
        if (context === null) {
            this.remove(CTX_PARENT_CONTEXT);
        } else {
            this.set(CTX_PARENT_CONTEXT, context);
        }
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
        if (options.type) {
            this.set(CTX_MODULE, options.type);
        }
        super.setOptions(options);
        if (options.parent instanceof AnnoationContext) {
            this.setParent(options.parent);
        }
    }
}
