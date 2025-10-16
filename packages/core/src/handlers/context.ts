import { Injector, InvokeArguments,  Operator,  ResolveInterceptorLike,  getType } from '@tsdi/ioc';
import { getResolverToken, ParameterScope } from './resolver';

/**
 * handle context options.
 */
export interface HandleContextOpts extends InvokeArguments {
    bootstrap?: boolean;
}

let a: Record<string, any>;

export interface HandleRequest extends Partial<Record<ParameterScope, any>> {
}

/**
 * invoke handle context.
 */
export class HandleContext  {
    readonly bootstrap: boolean;

    request: HandleRequest | null | undefined;

    constructor(
        injector: Injector,
        options: HandleContextOpts = {}) {
        this.bootstrap = options.bootstrap === true;
        Operator.setValue(injector, getType(this), this);
        this.initRequest(options);
    }

    protected initRequest(options: HandleContextOpts): void {
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
            const args = this.get(getResolverToken(this.request), null);
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
