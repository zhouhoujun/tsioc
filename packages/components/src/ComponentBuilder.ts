import {
    Singleton, ProviderTypes, Type, lang, isNullOrUndefined, isString,
    isBoolean, isDate, isObject, isArray, isNumber, DecoratorProvider, IInjector, Token
} from '@tsdi/ioc';
import { BuilderService, IBuildOption } from '@tsdi/boot';
import { IComponentBuilder, ComponentBuilderToken, ITemplateOption } from './IComponentBuilder';
import { IComponentReflect } from './IComponentReflect';
import { RefSelector } from './RefSelector';
import { COMPONENT_REFS, CTX_COMPONENT_REF, ELEMENT_REFS, ElementRef, ComponentRef } from './ComponentRef';
import { Component } from './decorators/Component';
import { NonSerialize } from './decorators/NonSerialize';
import { TemplateContext } from './parses/TemplateContext';
import { TemplateParseScope } from './parses/TemplateParseScope';
import { IPipeTransform } from './bindings/IPipeTransform';


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

    async resolveRef<T>(target: Type<T> | IBuildOption<T>): Promise<ComponentRef<T> | ElementRef<T>> {
        let ctx = await this.build(target);
        if (ctx.has(CTX_COMPONENT_REF)) {
            return ctx.get(CTX_COMPONENT_REF)
        } else {
            if (!ctx.injector.has(ELEMENT_REFS)) {
                ctx.injector.registerValue(ELEMENT_REFS, new WeakMap());
            }
            let map = ctx.injector.get(ELEMENT_REFS);
            let elRef = new ElementRef(ctx, ctx.target);
            map.set(ctx.target, elRef);
            return elRef;
        }
    }

    getPipe<T extends IPipeTransform>(token: Token<T>, injector: IInjector, decorator?: string): T {
        if (isString(token)) {
            token = this.reflects.getActionInjector().get(DecoratorProvider)
                .resolve(decorator || Component, RefSelector)?.toPipeToken(token) ?? token;
        }
        return injector.get(token);
    }

    getComponentRef<T>(target: T, injector?: IInjector): ComponentRef<T> {
        injector = injector ?? this.reflects.get(lang.getClass(target)).getInjector();
        return injector.get(COMPONENT_REFS)?.get(target);
    }

    /**
     * get element ref
     * @param target target element.
     * @param injector the injector target registed in.
     */
    getElementRef<T>(target: T, injector?: IInjector): ElementRef<T> {
        injector = injector ?? this.reflects.get(lang.getClass(target)).getInjector();
        return injector.get(ELEMENT_REFS)?.get(target);
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
