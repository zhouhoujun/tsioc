import { Abstract, Injector, InvocationContext, InvocationOption } from '@tsdi/ioc';

@Abstract()
export abstract class ExecptionContext<T = Error> extends InvocationContext {

    completed?: boolean;

    abstract get execption(): T;
    abstract set execption(val: T);

    static override create<T>(parent: InvocationContext | Injector, execption: T, options?: InvocationOption): ExecptionContext<T> {
        const ctx = InvocationContext.create(parent, options) as ExecptionContext<T>;
        ctx.setValue(ExecptionContext, ctx);
        ctx.execption = execption;
        return ctx;
    }
}