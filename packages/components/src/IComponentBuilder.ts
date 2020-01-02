import { ProviderTypes, Type, InjectToken, IInjector, Token } from '@tsdi/ioc';
import { IBuilderService, IBuildOption } from '@tsdi/boot';
import { IComponentRef } from './ComponentRef';
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
    resolveTemplate(options: ITemplateOption, ...providers: ProviderTypes[]): Promise<any>;
    /**
     * resolve node componsite of component.
     * @param target
     */
    resolveRef<T>(target: Type<T> | IBuildOption<T>): Promise<IComponentRef<T> | T>;
    /**
     * get pipe instance via token.
     * @param token
     * @param injector
     */
    getPipe<T extends IPipeTransform>(token: Token<T>, injector: IInjector): T;
    /**
     * get target component ref
     * @param target target injector.
     * @param injector the injector target registed in.
     */
    getComponentRef<T>(target: T, injector?: IInjector): IComponentRef<T> | T;
    /**
     * serialize component as template json.
     *
     * @param {*} component
     * @returns {*}
     * @memberof IComponentBuilder
     */
    serialize(component: any): any;
}
