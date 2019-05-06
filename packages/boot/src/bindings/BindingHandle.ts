import { Handle, CompositeHandle } from '../core';
import { BindingContext } from './BindingContext';
import { isNullOrUndefined } from '@tsdi/ioc';

export abstract class BindingHandle extends Handle<BindingContext> {

    isEmpty(ctx: BindingContext): boolean {
        return isNullOrUndefined(ctx.bindingValue);
    }
    /**
     * execute binding Handle.
     *
     * @abstract
     * @param {BindingContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof BootHandle
     */
    abstract execute(ctx: BindingContext, next: () => Promise<void>): Promise<void>;
}

export class CompositeBindingHandle extends CompositeHandle<BindingContext> {
    isEmpty(ctx: BindingContext): boolean {
        return isNullOrUndefined(ctx.bindingValue);
    }
}
