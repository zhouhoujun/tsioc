import { Singleton, ProviderTypes, Type, lang, isNullOrUndefined, isString, isBoolean, isDate, isObject, isArray, isNumber, DecoratorProvider } from '@tsdi/ioc';
import { BuilderService, HandleRegisterer, IModuleResolveOption, BootTargetAccessor } from '@tsdi/boot';
import { IComponentBuilder, ComponentBuilderToken, ITemplateOption } from './IComponentBuilder';
import { TemplateContext, TemplateParseScope } from './parses';
import { Component, NonSerialize } from './decorators';
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
        let ctx = TemplateContext.parse({decorator: Component.toString(), ...options, providers: [...(options.providers || []), ...providers] }, this.container.getFactory());
        await this.container.getInstance(HandleRegisterer)
            .get(TemplateParseScope)
            .execute(ctx);
        return ctx.value;
    }

    async resolveNode<T>(target: Type<T>, options: IModuleResolveOption, ...providers: ProviderTypes[]): Promise<any> {
        let bootTarget = this.resolve(target, options, ...providers);
        let pdr = this.container.getInstance(DecoratorProvider);
        let deckey = pdr.getKey(bootTarget);
        if (deckey && pdr.has(deckey, BootTargetAccessor)) {
            return pdr.resolve(deckey, BootTargetAccessor).getBoot(bootTarget, this.container);
        } else {
            return bootTarget;
        }
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
            let refs = reflects.get(compClass) as IBindingTypeReflect;
            if (refs && refs.componentSelector) {
                let json = {};
                let refselector = this.container.getInstance(DecoratorProvider).resolve(refs.componentDecorator, RefSelector);
                json[refselector.getComponentSelector()] = refs.componentSelector;
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
