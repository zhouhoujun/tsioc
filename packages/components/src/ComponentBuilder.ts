import {
    Singleton, ProviderTypes, Type, lang, isNullOrUndefined, isString,
    isBoolean, isDate, isObject, isArray, isNumber, DecoratorProvider
} from '@tsdi/ioc';
import { BuilderService, IBuildOption, BuildContext } from '@tsdi/boot';
import { IComponentBuilder, ComponentBuilderToken, ITemplateOption } from './IComponentBuilder';
import { IComponentReflect } from './IComponentReflect';
import { ComponentProvider } from './ComponentProvider';
import { CTX_COMPONENT_REF, ElementRef, ComponentRef, CTX_ELEMENT_REF, TemplateRef, CTX_TEMPLATE_REF } from './ComponentRef';
import { NonSerialize } from './decorators/NonSerialize';
import { TemplateContext } from './parses/TemplateContext';
import { TemplateParseScope } from './parses/TemplateParseScope';


/**
 * component builder.
 *
 * @export
 * @class ComponentBuilder
 * @extends {BuilderService}
 */
@Singleton(ComponentBuilderToken)
export class ComponentBuilder extends BuilderService implements IComponentBuilder {

    async resolveTemplate(options: ITemplateOption, ...providers: ProviderTypes[]): Promise<TemplateRef<any>> {
        let ctx = TemplateContext.parse(options.injector || this.container, options);
        providers.length && ctx.providers.inject(...providers);
        await this.reflects.getActionInjector().get(TemplateParseScope)
            .execute(ctx);
        return ctx.getResultRef();
    }

    async resolveRef<T>(target: Type<T> | IBuildOption<T>): Promise<ComponentRef<T> | TemplateRef<T> | ElementRef<T> | T> {
        let ctx = await this.build(target);
        return this.getRefInCtx(ctx);
    }

    protected getRefInCtx(ctx: BuildContext) {
        return ctx.get(CTX_COMPONENT_REF) ?? ctx.get(CTX_TEMPLATE_REF) ?? ctx.get(CTX_ELEMENT_REF) ?? ctx.value;
    }

    serialize<T = any>(component: T): any {
        if (!component) {
            return null;
        }

        if (isArray(component)) {
            return component.map(c => this.serialize(c));
        } else if (isString(component) || isNumber(component) || isBoolean(component)) {
            return component;
        } else if (isDate(component)) {
            return component.toString();
        } else if (isObject(component)) {
            let reflects = this.reflects;
            let compClass = lang.getClass(component);
            let refs = reflects.get(compClass) as IComponentReflect;
            if (refs && refs.selector) {
                let json = {};
                let refselector = this.reflects.getActionInjector().getInstance(DecoratorProvider).resolve(refs.decorator, ComponentProvider);
                json[refselector.getSelectorKey()] = refs.selector;
                refs.propInBindings.forEach((v, key) => {
                    if (reflects.hasMetadata(NonSerialize, compClass, key, 'property')) {
                        return;
                    }
                    let val = this.serialize(component[key]);
                    if (isNullOrUndefined(val)) {
                        if (v) {
                            try {
                                json[key] = JSON.parse(JSON.stringify(v));
                            } catch (er) {
                                console.log(er);
                            }
                        }
                    } else {
                        json[key] = val;
                    }
                });
                return JSON.parse(JSON.stringify(json));
            } else {
                return null;
            }
        }
        return null;
    }
}
