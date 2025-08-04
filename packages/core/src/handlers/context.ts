import { DefaultInvocationContext, Injector, InvokeArguments, OperationArgumentResolver, composeResolvers, getType } from '@tsdi/ioc';
import { getResolverToken } from './resolver';

/**
 * handle context options.
 */
export interface HandleContextOpts extends InvokeArguments {
    bootstrap?: boolean;
}

/**
 * invoke handle context.
 */
export class HandleContext extends DefaultInvocationContext {
    readonly bootstrap: boolean;
    constructor(
        injector: Injector,
        options: HandleContextOpts = {}) {
        super(injector, options);
        this.bootstrap = options.bootstrap === true;
        this.setValue(getType(this), this);
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

    protected override getArgumentResolver(): OperationArgumentResolver[] {
        const res: OperationArgumentResolver[] = [];
        const defRels = this.playloadDefaultResolvers();
        if (defRels?.length) {
            res.push(composeResolvers(defRels));
        }
        if (this.request) {
            const args = this.injector.get(getResolverToken(this.request), null);
            if (args?.length) {
                res.unshift(composeResolvers(args));
            }
        }
        return res;
    }

    protected playloadDefaultResolvers(): OperationArgumentResolver[] | null {
        return null
    }

    protected override clear(): void {
        super.clear();
        this.execption = null
    }

}
