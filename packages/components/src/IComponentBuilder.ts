import { Provider, tokenId, TokenId } from '@tsdi/ioc';
import { IBuilderService } from '@tsdi/boot';
import { ITemplateOption, ITemplateContext } from './compile/TemplateContext';



/**
 * component build token.
 */
export const ComponentBuilderToken: TokenId<IComponentBuilder> = tokenId<IComponentBuilder>('ComponentBuilder');


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
     * @param {...Provider[]} providers
     * @returns {Promise<any>}
     * @memberof IComponentBuilder
     */
    buildTemplate(options: ITemplateOption, ...providers: Provider[]): Promise<ITemplateContext>;
    /**
     * reolve template.
     *
     * @param {ITemplateOption} options
     * @param {...Provider[]} providers
     * @returns {Promise<ITemplateRef>}
     * @memberof IComponentBuilder
     */
    resolveTemplate(options: ITemplateOption, ...providers: Provider[]): Promise<any>;
    /**
     * serialize component as template json.
     *
     * @param {*} component
     * @returns {*}
     * @memberof IComponentBuilder
     */
    serialize(component: any): any;
}
