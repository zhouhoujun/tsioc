import { Type, ContainerFactory, createRaiseContext, IocProvidersOption, IocProvidersContext, lang, isToken } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { RegFor, IModuleReflect, ModuleConfigure } from './modules';
import { AnnotationServiceToken } from './IAnnotationService';
import { RegisterForMetadata, RegisterFor } from './decorators';
import { CTX_MODULE_DECTOR, CTX_MODULE_REGFOR, CTX_MODULE_ANNOATION } from '../context-tokens';

/**
 * annoation action option.
 *
 * @export
 * @interface AnnoationOption
 * @extends {ActionContextOption}
 */
export interface AnnoationOption extends IocProvidersOption<IContainer> {
    /**
     * target module type.
     *
     * @type {Type}
     * @memberof AnnoationActionOption
     */
    module?: Type;
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
    annoation?: ModuleConfigure;

    /**
     * set where this module to register. default as child module.
     *
     * @type {boolean}
     * @memberof ModuleConfig
     */
    regFor?: RegFor;

    /**
     * raise contianer.
     *
     * @type {ContainerFactory}
     * @memberof IModuleResolveOption
     */
    raiseContainer?: ContainerFactory<IContainer>;
}


/**
 * annoation context.
 *
 * @export
 * @class AnnoationContext
 * @extends {HandleContext}
 */
export class AnnoationContext<T extends AnnoationOption = AnnoationOption, TMeta extends ModuleConfigure = ModuleConfigure> extends IocProvidersContext<T, IContainer> {


    static parse(target: Type | AnnoationOption, raiseContainer?: ContainerFactory<IContainer>): AnnoationContext {
        return createRaiseContext<AnnoationContext<AnnoationOption>>(AnnoationContext, isToken(target) ? { module: target } : target, raiseContainer);
    }

    get module(): Type {
        return this.getOptions().module;
    }

    setModule(module: Type) {
        this.getOptions().module = module;
    }

    get decorator(): string {
        if (!this.has(CTX_MODULE_DECTOR) && this.module) {
            let dec = this.getContainer().get(AnnotationServiceToken).getDecorator(this.module);
            if (!dec) {
                dec = this.targetReflect.decorator;
            }
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

    get regFor(): RegFor {
        if (!this.has(CTX_MODULE_REGFOR)) {
            let regFor = this.annoation.regFor;
            if (!regFor) {
                let meta = lang.first(this.reflects.getMetadata<RegisterForMetadata>(RegisterFor, this.module));
                regFor = meta ? meta.regFor : RegFor.child;
            }
            this.set(CTX_MODULE_REGFOR, regFor);
        }
        return this.get(CTX_MODULE_REGFOR);
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
            this.set(CTX_MODULE_ANNOATION, (tgRef && tgRef.getAnnoation) ? tgRef.getAnnoation<TMeta>() : this.getContainer().get(AnnotationServiceToken).getAnnoation(this.module, this.get(CTX_MODULE_DECTOR)));
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

        if (options.regFor) {
            this.set(CTX_MODULE_REGFOR, options.regFor);
        }
    }
}
