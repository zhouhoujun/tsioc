import {
    Singleton, ProviderTypes, lang, isString,
    isBoolean, isDate, isObject, isArray, isNumber, isUndefined
} from '@tsdi/ioc';
import { BuilderService } from '@tsdi/boot';
import { IComponentBuilder, ComponentBuilderToken } from './IComponentBuilder';
import { IComponentReflect } from './IComponentReflect';
import { ComponentProvider } from './ComponentProvider';
import { CTX_TEMPLATE_REF } from './ComponentRef';
import { NonSerialize } from './decorators/NonSerialize';
import { ITemplateOption, ITemplateContext } from './compile/TemplateContext';
import { TemplateContext } from './compile/TemplateContext';
import { TemplateParseScope } from './compile/parse-templ';
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

    /**
     * build template.
     *
     * @param {ITemplateOption} options
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<ITemplateContext>}
     */
    async buildTemplate(options: ITemplateOption, ...providers: ProviderTypes[]): Promise<ITemplateContext> {
        let injector = options.injector ?? options.parent?.injector;
        let ctx = TemplateContext.parse(injector || this.container, options);
        providers.length && ctx.providers.inject(...providers);
        await this.reflects.getActionInjector().getInstance(TemplateParseScope)
            .execute(ctx);
        if (!ctx.destroyed) {
            let compPdr = ctx.componentProvider;
            if (isArray(ctx.value) && compPdr && compPdr.parseRef && !ctx.getOptions().attr && !ctx.hasValue(CTX_TEMPLATE_REF)) {
                let compCtx: ITemplateContext;
                if (compPdr.isTemplateContext(ctx)) {
                    compCtx = ctx;
                } else {
                    compCtx = compPdr.createTemplateContext(ctx.injector);
                    compCtx.context.copy(ctx.context);
                }
                let tempref = isArray(ctx.value) ? compPdr.createTemplateRef(compCtx, ...ctx.value)
                    : compPdr.createTemplateRef(compCtx, ctx.value);
                ctx.setValue(CTX_TEMPLATE_REF, tempref);
            }
        }
        return ctx;
    }

    async resolveTemplate(options: ITemplateOption, ...providers: ProviderTypes[]): Promise<any> {
        let ctx = await this.buildTemplate(options, ...providers);
        return !ctx.destroyed ? ctx.getResultRef() : ctx.value;
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
