import { ProviderTypes, tokenId } from '@tsdi/ioc';
import { IBuilderService } from '@tsdi/boot';
import { ITemplateOption, ITemplateContext } from './parses/TemplateContext';



/**
 * component build token.
 */
export const ComponentBuilderToken = tokenId<IComponentBuilder>('ComponentBuilder');


/**
 * component builder.
 *
 * @export
 * @interface IComponentBuilder
 * @extends {IBuilderService}
 */
export interface IComponentBuilder extends IBuilderService {
    /**
     * build template.
     *
     * @param {ITemplateOption} options
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<any>}
     * @memberof IComponentBuilder
     */
    buildTemplate(options: ITemplateOption, ...providers: ProviderTypes[]): Promise<ITemplateContext>;
    /**
     * reolve template.
     *
     * @param {ITemplateOption} options
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<ITemplateRef>}
     * @memberof IComponentBuilder
     */
    resolveTemplate(options: ITemplateOption, ...providers: ProviderTypes[]): Promise<any>;
    /**
     * serialize component as template json.
     *
     * @param {*} component
     * @returns {*}
     * @memberof IComponentBuilder
     */
    serialize(component: any): any;
}
