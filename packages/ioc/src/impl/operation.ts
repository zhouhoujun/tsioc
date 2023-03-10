import { ClassType } from '../types';
import { InvocationContext } from '../context';
import { OperationInvoker } from '../operation';
import { isTypeObject } from '../utils/obj';
import { isFunction } from '../utils/chk';
import { ReflectiveRef } from '../reflective';



/**
 * reflective operation invoker.
 * implements {@link OperationInvoker}
 */
export class ReflectiveOperationInvoker<T = any> implements OperationInvoker<T> {

    private _returnType!: ClassType;
    constructor(
        private typeRef: ReflectiveRef<T>,
        private method: string,
        private instance?: any | (() => any)) {

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
     */
    invoke(): T;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     */
    invoke(context: InvocationContext): T;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param proceed proceed invoke with hooks
     */
    invoke(context: InvocationContext, instance: object): T;
    invoke(context?: any, arg?: object): T {
        let instance;

        if (context) {
            if (isFunction(context)) {
                context = null;
            } else if (arg && isTypeObject(arg)) {
                instance = arg;
            } else {
                if (this.instance) {
                    instance = isFunction(this.instance) ? this.instance() : this.instance;
                }
            }
        } else {
            context = this.typeRef.getContext(this.method);
        }

        return this.typeRef.class.invoke(this.method, context, instance);
    }

    /**
     * resolve args.
     * @param context 
     */
    resolveArguments(context?: InvocationContext): any[] {
        return this.typeRef.resolveArguments(this.method, context ?? this.typeRef.getContext(this.method))
    }
}
