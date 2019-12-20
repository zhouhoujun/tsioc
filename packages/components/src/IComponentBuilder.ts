import { ProviderTypes, Type, InjectToken, ClassType } from '@tsdi/ioc';
import { IBuilderService, IModuleBuildOption } from '@tsdi/boot';

/**
 * template option.
 *
 * @export
 * @interface ITemplateOption
 * @extends {IModuleBuildOption}
 */
export interface ITemplateOption extends IModuleBuildOption {
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
    resolveNode<T>(target: Type<T> | IModuleBuildOption<T>): Promise<any>;
    /**
     * serialize component as template json.
     *
     * @param {*} component
     * @returns {*}
     * @memberof IComponentBuilder
     */
    serialize(component: any): any;
}
