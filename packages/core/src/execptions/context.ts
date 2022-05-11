import { Abstract, createContext, getClass, Injector, InvocationContext, InvocationOption } from '@tsdi/ioc';

@Abstract()
export abstract class ExecptionContext<T extends Error = Error> extends InvocationContext {
    completed?: boolean;
    abstract get execption(): T;
    abstract set execption(val: T);
}


export function createExecptionContext<T extends Error>(parent: InvocationContext | Injector, execption: T, options?: InvocationOption): ExecptionContext<T> {
    const ctx = createContext(parent, options) as ExecptionContext<T>;
    ctx.injector.setValue(ExecptionContext, ctx);
    ctx.injector.setValue(getClass(execption), execption);
    ctx.execption = execption;
    return ctx;
}
