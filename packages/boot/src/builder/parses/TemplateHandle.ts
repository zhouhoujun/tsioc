import { Handle, CompositeHandle } from '../../core';
import { TemplateContext } from './TemplateContext';

export abstract class TemplateHandle extends Handle<TemplateContext> {
    /**
     * execute binding Handle.
     *
     * @abstract
     * @param {TemplateContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof BootHandle
     */
    abstract execute(ctx: TemplateContext, next: () => Promise<void>): Promise<void>;
}

export class TemplatesHandle extends CompositeHandle<TemplateContext> {

}
