import {
    Singleton, ProviderTypes, Type, lang, isNullOrUndefined, isString,
    isBoolean, isDate, isObject, isArray, isNumber, DecoratorProvider
} from '@tsdi/ioc';
import { BuilderService, IBuildOption } from '@tsdi/boot';
import { IComponentBuilder, ComponentBuilderToken, ITemplateOption } from './IComponentBuilder';
import { IComponentReflect } from './IComponentReflect';
import { RefSelector } from './RefSelector';
import { APP_COMPONENT_REFS } from './ComponentRef';
import { Component } from './decorators/Component';
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

    async resolveTemplate(options: ITemplateOption, ...providers: ProviderTypes[]): Promise<any> {
        let ctx = TemplateContext.parse(options.injector || this.container, { decorator: Component.toString(), ...options });
        providers.length && ctx.providers.inject(...providers);
        await this.reflects.getActionInjector().get(TemplateParseScope)
            .execute(ctx);
        return ctx.value;
    }

    async resolveNode<T>(target: Type<T> | IBuildOption<T>): Promise<any> {
        let ctx = await this.resolveContext(target);
        let bootTarget = this.getBootTarget(ctx);

        return this.container.get(APP_COMPONENT_REFS).get(bootTarget) || bootTarget;
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
                let refselector = this.reflects.getActionInjector().getInstance(DecoratorProvider).resolve(refs.decorator, RefSelector);
                json[refselector.getComponentSelector()] = refs.selector;
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
