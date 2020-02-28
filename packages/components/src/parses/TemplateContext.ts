import { Injectable, Type, createRaiseContext, tokenId } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
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
export const TemplateOptionToken = tokenId<ITemplateOption>('COMPONENT_TEMPLATE_OPTION');


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
    static parse(injector: ICoreInjector, options: ITemplateOption): TemplateContext {
        return createRaiseContext(injector, TemplateContext, options);
    }
}
