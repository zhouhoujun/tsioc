import { ClassType } from '../types';
import { TypeDef } from '../metadata/type';
import { InvocationContext } from '../context';
import { OperationInvoker, Proceed } from '../operation';
import { isTypeObject } from '../utils/obj';
import { isFunction } from '../utils/chk';



/**
 * reflective operation invoker.
 * implements {@link OperationInvoker}
 */
export class ReflectiveOperationInvoker<T = any> implements OperationInvoker<T> {

    private _returnType!: ClassType;
    constructor(
        private typeRef: TypeDef,
        private method: string,
        private instance?: any | (() => any),
        private proceed?: Proceed<T>) {
    }

    get descriptor(): TypedPropertyDescriptor<T> {
        return this.typeRef.class.getDescriptor(this.method)
    }

    get returnType(): ClassType {
        if (!this._returnType) {
            this._returnType = this.typeRef.class.getReturnning(this.method) ?? Object
        }
        return this._returnType
    }

    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param proceed proceed invoke with hooks
     */
    invoke(context: InvocationContext, proceed?: Proceed<T>): T
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param proceed proceed invoke with hooks
     */
    invoke(context: InvocationContext, instance: object, proceed?: Proceed<T>): T;
    invoke(context: InvocationContext, arg?: object | Function, proceed?: Proceed<T>): T {
        let instance;
        if (arg && isTypeObject(arg)) {
            instance = arg;
        } else {
            proceed = arg as any;
            if (this.instance) {
                instance = isFunction(this.instance) ? this.instance() : this.instance;
            }
        }

        if (this.proceed && proceed) {
            const fistProc = this.proceed;
            const secProc = proceed;
            proceed = (ctx, run) => {
                return fistProc(ctx, (c) => secProc(c, run));
            }
        } else {
            proceed = this.proceed ?? proceed;
        }

        return this.typeRef.class.invoke(this.method, context, instance, proceed)
    }

    /**
     * resolve args.
     * @param context 
     */
    resolveArguments(context: InvocationContext): any[] {
        return this.typeRef.class.resolveArguments(this.method, context)
    }
}
