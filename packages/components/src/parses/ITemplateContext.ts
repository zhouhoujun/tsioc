import { Type, tokenId } from '@tsdi/ioc';
import { IComponentContext, IComponentOption } from '../ComponentContext';
import { ITemplateRef } from '../ComponentRef';



/**
 * template option.
 *
 * @export
 * @interface ITemplateOption
 * @extends {IBuildOption}
 */
export interface ITemplateOption extends IComponentOption {
    selector?: Type;
    tempRef?: boolean;
}

/**
 * Template option token.
 */
export const TemplateOptionToken = tokenId<ITemplateOption>('COMPONENT_TEMPLATE_OPTION');


export interface ITemplateContext<T extends ITemplateOption = ITemplateOption> extends IComponentContext<T> {
    selector?: Type;
    getResultRef(): ITemplateRef;
}
