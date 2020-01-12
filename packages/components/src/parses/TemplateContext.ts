import { Injectable, Type, InjectToken, createRaiseContext } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { IComponentContext } from '@tsdi/boot';
import { ITemplateOption } from '../IComponentBuilder';
import { IComponentMetadata } from '../decorators/IComponentMetadata';
import { CompContext } from './CompContext';


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
export class TemplateContext extends CompContext<ITemplateOption> implements IComponentContext {

    selector?: Type;

    static parse(injector: ICoreInjector, options: ITemplateOption): TemplateContext {
        return createRaiseContext(injector, TemplateContext, options);
    }
}
