import { ContainerFactory, Injectable, Type, InjectToken, createRaiseContext } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { IComponentContext, AnnoationContext } from '@tsdi/boot';
import { ITemplateOption } from '../IComponentBuilder';


/**
 * Template option token.
 */
export const TemplateOptionToken = new InjectToken<ITemplateOption>('COMPONENT_TEMPLATE_OPTION');

/**
 * template context.
 *
 * @export
 * @class TemplateContext
 * @extends {IocRaiseContext<IContainer>}
 * @implements {IComponentContext}
 */
@Injectable
export class TemplateContext extends AnnoationContext<ITemplateOption> implements IComponentContext {

    selector?: Type;

    value?: any;

    static parse(options: ITemplateOption, raiseContainer: ContainerFactory<IContainer>): TemplateContext {
        return createRaiseContext(TemplateContext, options, raiseContainer);
    }
}
