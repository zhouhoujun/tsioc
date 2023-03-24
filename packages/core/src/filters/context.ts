import { CONTEXT_ARGS, DefaultInvocationContext, EMPTY, Injector, InvocationOption, OperationArgumentResolver } from '@tsdi/ioc';
import { getResolversToken } from './resolver';
import { primitiveResolvers } from './resolvers';

/**
 * endpoint context.
 */
export class EndpointContext<TInput = any> extends DefaultInvocationContext<TInput> {

    private _args?: TInput;
    override get arguments(): TInput {
        if(!this._args) {
            this._args = this.injector.get(CONTEXT_ARGS);
        }
        return this._args!;
    }

    set arguments(val: TInput) {
        this._args = val;
        this.injector.setValue(CONTEXT_ARGS, this._args);
    }

    /**
     * execption.
     */
    execption?: any;

    protected override getArgumentResolver(): OperationArgumentResolver<any>[] {
        if (!this.arguments) return EMPTY;
        return this.injector.get(getResolversToken(this.arguments), primitiveResolvers);
    }

    protected override clear(): void {
        super.clear();
        this.execption = null;
    }

}

/**
 * create invocation context.
 * @param parent 
 * @param options 
 * @returns 
 */
export function createEndpointContext<T>(parent: Injector, options?: InvocationOption<T>): EndpointContext {
    return new EndpointContext(parent, options)
}