import { BuildHandle, BuildHandles } from '@tsdi/boot';
import { ITemplateContext } from './TemplateContext';

/**
 * template handle.
 *
 * @export
 * @abstract
 * @class TemplateHandle
 * @extends {BuildHandle<ITemplateContext>}
 */
export abstract class TemplateHandle extends BuildHandle<ITemplateContext> {
    /**
     * execute binding Handle.
     *
     * @abstract
     * @param {ITemplateContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof BootHandle
     */
    abstract execute(ctx: ITemplateContext, next: () => Promise<void>): Promise<void>;
}

/**
 * templates handle.
 *
 * @export
 * @class TemplatesHandle
 * @extends {BuildHandles<ITemplateContext>}
 */
export class TemplatesHandle extends BuildHandles<ITemplateContext> {

}
