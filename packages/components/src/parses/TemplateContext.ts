import { Injectable, Type, InjectToken, createRaiseContext } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IComponentContext, AnnoationContext } from '@tsdi/boot';
import { ITemplateOption } from '../IComponentBuilder';
import { IComponentMetadata } from '../decorators/IComponentMetadata';


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
export class TemplateContext extends AnnoationContext<ITemplateOption, IComponentMetadata> implements IComponentContext {

    selector?: Type;

    value?: any;

    static parse(injector: ICoreInjector, options: ITemplateOption): TemplateContext {
        return createRaiseContext(injector, TemplateContext, options);
    }
}
