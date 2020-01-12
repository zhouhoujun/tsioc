import { ProviderTypes, Type, InjectToken, IInjector, Token } from '@tsdi/ioc';
import { IBuilderService, IBuildOption } from '@tsdi/boot';
import { ElementRef, ComponentRef, TemplateRef } from './ComponentRef';
import { IPipeTransform } from './bindings/IPipeTransform';

/**
 * template option.
 *
 * @export
 * @interface ITemplateOption
 * @extends {IBuildOption}
 */
export interface ITemplateOption extends IBuildOption {
    selector?: Type;
}

/**
 * component build token.
 */
export const ComponentBuilderToken = new InjectToken<IComponentBuilder>('ComponentBuilder');


/**
 * component builder.
 *
 * @export
 * @interface IComponentBuilder
 * @extends {IBuilderService}
 */
export interface IComponentBuilder extends IBuilderService {
    /**
     * reolve template.
     *
     * @param {ITemplateOption} options
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<any>}
     * @memberof IComponentBuilder
     */
    resolveTemplate(options: ITemplateOption, ...providers: ProviderTypes[]): Promise<TemplateRef>;
    /**
     * resolve node componsite of component.
     * @param target
     */
    resolveRef<T>(target: Type<T> | IBuildOption<T>): Promise<ComponentRef<T> | TemplateRef<T> | ElementRef<T> | T>;
    /**
     * get pipe instance via token.
     * @param token
     * @param injector
     * @param decorator the component decorator.
     */
    getPipe<T extends IPipeTransform>(token: Token<T>, injector: IInjector, decorator?: string): T
    /**
     * get target component ref
     * @param target target component.
     * @param injector the injector target registed in.
     */
    getComponentRef<T>(target: T, injector?: IInjector): ComponentRef<T>;

    /**
     * get element ref
     * @param target target element.
     * @param injector the injector target registed in.
     */
    getElementRef<T>(target: T, injector?: IInjector): ElementRef<T>;
    /**
     * serialize component as template json.
     *
     * @param {*} component
     * @returns {*}
     * @memberof IComponentBuilder
     */
    serialize(component: any): any;
}
