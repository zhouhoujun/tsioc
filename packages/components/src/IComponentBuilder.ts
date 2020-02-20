import { ProviderTypes, tokenId } from '@tsdi/ioc';
import { IBuilderService } from '@tsdi/boot';
import { ITemplateRef } from './ComponentRef';
import { ITemplateOption } from './parses/ITemplateContext';



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
     * reolve template.
     *
     * @param {ITemplateOption} options
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<any>}
     * @memberof IComponentBuilder
     */
    resolveTemplate(options: ITemplateOption, ...providers: ProviderTypes[]): Promise<ITemplateRef>;
    /**
     * serialize component as template json.
     *
     * @param {*} component
     * @returns {*}
     * @memberof IComponentBuilder
     */
    serialize(component: any): any;
}
