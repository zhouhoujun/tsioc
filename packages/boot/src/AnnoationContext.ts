import { Type, createRaiseContext, IocProvidersOption, IocProvidersContext, isToken, IInjector, ClassType, RegInMetadata, ClassMetadata } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
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

}

/**
 * annoation context.
 *
 * @export
 * @class AnnoationContext
 * @extends {HandleContext}
 */
export class AnnoationContext<T extends AnnoationOption = AnnoationOption, TMeta extends ModuleConfigure = ModuleConfigure> extends IocProvidersContext<T, IContainer> {

    static parse(injector: IInjector, target: ClassType | AnnoationOption): AnnoationContext {
        return createRaiseContext(injector, AnnoationContext, isToken(target) ? { module: target } : target);
    }

    get module(): Type {
        return this.injector.getTokenProvider(this.getOptions().module);
    }

    setModule(type: ClassType) {
        this.getOptions().module = this.injector.getTokenProvider(type);
    }

    get decorator(): string {
        if (!this.has(CTX_MODULE_DECTOR) && this.module) {
            let dec = this.targetReflect.decorator;
            if (dec) {
                this.set(CTX_MODULE_DECTOR, dec);
            }
        }
        return this.get(CTX_MODULE_DECTOR);
    }

    private _targetReflect: IModuleReflect;
    get targetReflect(): IModuleReflect {
        if (!this._targetReflect && this.module) {
            this._targetReflect = this.reflects.get(this.module);
        }
        return this._targetReflect;
    }

    /**
     * annoation metadata.
     *
     * @type {ModuleConfigure}
     * @memberof AnnoationContext
     */
    get annoation(): TMeta {
        if (!this.has(CTX_MODULE_ANNOATION) && this.module) {
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
        super.setOptions(options);

        if (options.decorator) {
            this.set(CTX_MODULE_DECTOR, options.decorator);
        }
        if (options.annoation) {
            this.set(CTX_MODULE_ANNOATION, options.annoation);
        }
    }
}
