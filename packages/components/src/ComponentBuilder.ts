import {
    Singleton, ProviderTypes, lang, isString,
    isBoolean, isDate, isObject, isArray, isNumber, isUndefined
} from '@tsdi/ioc';
import { BuilderService, BuildContext } from '@tsdi/boot';
import { IComponentBuilder, ComponentBuilderToken } from './IComponentBuilder';
import { IComponentReflect } from './IComponentReflect';
import { ComponentProvider } from './ComponentProvider';
import { CTX_COMPONENT_REF, CTX_ELEMENT_REF, CTX_TEMPLATE_REF, ITemplateRef } from './ComponentRef';
import { NonSerialize } from './decorators/NonSerialize';
import { ITemplateOption } from './parses/TemplateContext';
import { TemplateContext } from './parses/TemplateContext';
import { TemplateParseScope } from './parses/TemplateParseScope';
import { Input } from './decorators/Input';


/**
 * component builder.
 *
 * @export
 * @class ComponentBuilder
 * @extends {BuilderService}
 */
@Singleton(ComponentBuilderToken)
export class ComponentBuilder extends BuilderService implements IComponentBuilder {

    async resolveTemplate(options: ITemplateOption, ...providers: ProviderTypes[]): Promise<ITemplateRef> {
        let ctx = TemplateContext.parse(options.injector || this.container, options);
        providers.length && ctx.providers.inject(...providers);
        await this.reflects.getActionInjector().getInstance(TemplateParseScope)
            .execute(ctx);
        return ctx.getResultRef();
    }

    protected getRefInCtx(ctx: BuildContext) {
        return ctx.context.getFirstValue(CTX_COMPONENT_REF, CTX_TEMPLATE_REF, CTX_ELEMENT_REF) ?? ctx.value;
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
                let refselector = refs.getDecorProviders().getInstance(ComponentProvider);
                json[refselector.getSelectorKey()] = refs.selector;
                refs.getBindings(Input.toString()).forEach((v, key) => {
                    if (reflects.hasMetadata(NonSerialize, compClass, key, 'property')) {
                        return;
                    }
                    let val = this.serialize(component[key]);
                    if (!isUndefined(val)) {
                        json[v.bindingName || key] = val;
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
