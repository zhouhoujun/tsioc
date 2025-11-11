import { DefaultInvocationContext, Injector, InvocationRequest, InvokeArguments,  ResolveInterceptorLike,  getType } from '@tsdi/ioc';
import { getResolveHandlerToken, ParameterScope } from './resolver';

/**
 * handle context options.
 */
export interface HandleContextOpts extends InvokeArguments {
    bootstrap?: boolean;
}

let a: Record<string, any>;

export interface HandleRequest extends InvocationRequest, Partial<Record<ParameterScope, any>> {
}

/**
 * invoke handle context.
 */
export class HandleContext extends DefaultInvocationContext {
    readonly bootstrap: boolean;

    request: HandleRequest | null | undefined;

    constructor(
        injector: Injector,
        options: HandleContextOpts = {}) {
        super(injector, options);
        this.bootstrap = options.bootstrap === true;
        this.setValue(getType(this), this);
    }

    protected override initRequest(options: HandleContextOpts): void {
        this.request = options.request ?? {};
    }

    private _execption: any;
    /**
     * execption.
     */
    get execption(): any {
        return this._execption;
    }

    set execption(err: any) {
        this._execption = err;
        this.onException(err);
    }

    protected onException(err: any) { }

    protected override getArgumentResolver(): ResolveInterceptorLike[] {
        const res: ResolveInterceptorLike[] = [];
        const defRels = this.playloadDefaultResolvers();
        if (defRels?.length) {
            res.push(...defRels);
        }
        if (this.request) {
            const args = this.get(getResolveHandlerToken(this.request), null);
            if (args?.length) {
                res.unshift(...args);
            }
        }
        return res;
    }

    protected playloadDefaultResolvers(): ResolveInterceptorLike[] | null {
        return null
    }

    protected override clear(): void {
        super.clear();
        this.execption = null
    }

}
