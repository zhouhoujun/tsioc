import { BuilderService, HandleRegisterer, IModuleResolveOption, BootTargetAccessor } from '@tsdi/boot';
import { Singleton, ProviderTypes, Type, DecoratorProvider, lang, isNullOrUndefined, isString, isBoolean, isDate, isObject, hasPropertyMetadata, isArray } from '@tsdi/ioc';
import { TemplateContext, TemplateParseScope } from './parses';
import { Component, NonSerialize } from './decorators';
import { IComponentBuilder, ComponentBuilderToken, ITemplateOption } from './IComponentBuilder';
import { IBindingTypeReflect } from './bindings';
import { RefSelector } from './RefSelector';
/**
 * component builder.
 *
 * @export
 * @class ComponentBuilder
 * @extends {BuilderService}
 */
@Singleton(ComponentBuilderToken)
export class ComponentBuilder extends BuilderService implements IComponentBuilder {

    async resolveTemplate(options: ITemplateOption, ...providers: ProviderTypes[]): Promise<any> {
        let ctx = TemplateContext.parse({ ...options, providers: [...(options.providers || []), ...providers] });
        ctx.decorator = ctx.decorator || Component.toString();
        if (!ctx.hasRaiseContainer()) {
            ctx.setRaiseContainer(this.container);
        }
        await this.container.get(HandleRegisterer)
            .get(TemplateParseScope)
            .execute(ctx);
        return ctx.value;
    }


    async resolveNode<T>(target: Type<T>, options: IModuleResolveOption, ...providers: ProviderTypes[]): Promise<any> {
        let bootTarget = this.resolve(target, options, ...providers);

        let pdr = this.container.get(DecoratorProvider);
        let deckey = pdr.getKey(bootTarget);
        if (deckey && pdr.has(deckey, BootTargetAccessor)) {
            return pdr.resolve(deckey, BootTargetAccessor).getBoot(bootTarget, this.container);
        } else {
            return bootTarget;
        }
    }

    serialize<T = any>(component: T): any {
        if (!component) {
            return {};
        }

        if (isArray(component)) {
            return component.map(c => this.serialize(c));
        } else if (isString(component) || isBoolean(component) || isDate(component)) {
            return component;
        } else if (isObject(component)) {
            let compClass = lang.getClass(component);
            let refs = this.container.getTypeReflects().get(compClass) as IBindingTypeReflect;
            if (refs.componentSelector) {
                let json = {};
                let refselector = this.container.get(DecoratorProvider).resolve(refs.componentDecorator, RefSelector);
                json[refselector.getComponentSelector()] = refs.componentSelector;
                refs.propInBindings.forEach((v, key) => {
                    if (hasPropertyMetadata(NonSerialize, compClass, key)) {
                        return;
                    }
                    let val = this.serialize(v);
                    if (!isNullOrUndefined(val)) {
                        json[key] = val;
                    }
                });
                return json;
            } else {
                return null;
            }
        }
        return null;
    }
}
