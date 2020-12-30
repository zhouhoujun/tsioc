import { Injectable, Type, tokenId, TokenId, IInjector } from '@tsdi/ioc';
import { createContext } from '@tsdi/boot';
import { ComponentContext, IComponentOption, IComponentContext  } from '../ComponentContext';


/**
 * template option.
 *
 * @export
 * @interface ITemplateOption
 * @extends {IBuildOption}
 */
export interface ITemplateOption extends IComponentOption {
    selector?: Type;
}

/**
 * Template option token.
 */
export const TemplateOptionToken: TokenId<ITemplateOption> = tokenId<ITemplateOption>('COMPONENT_TEMPLATE_OPTION');


export interface ITemplateContext<T extends ITemplateOption = ITemplateOption> extends IComponentContext<T> {
    selector?: Type;
}


/**
 * template context.
 *
 * @export
 * @class TemplateContext
 * @extends {IocRaiseContext<IContainer>}
 * @implements {IComponentContext}
 */
@Injectable
export class TemplateContext extends ComponentContext<ITemplateOption> implements ITemplateContext<ITemplateOption> {
    selector?: Type;
    static parse(injector: IInjector, options: ITemplateOption): TemplateContext {
        return createContext(injector, TemplateContext, options);
    }
}
