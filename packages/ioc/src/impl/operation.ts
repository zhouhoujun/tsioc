import { ClassType } from '../types';
import { InvocationContext } from '../context';
import { OperationInvoker } from '../operation';
import { isTypeObject } from '../utils/obj';
import { isFunction } from '../utils/chk';
import { InvokerOptions, ReflectiveRef } from '../reflective';
import { OnDestroy } from '../destroy';



/**
 * reflective operation invoker.
 * implements {@link OperationInvoker}
 */
export class ReflectiveOperationInvoker<T = any> implements OperationInvoker<T>, OnDestroy {

    private _returnType!: ClassType;
    constructor(
        private _typeRef: ReflectiveRef<T>,
        readonly method: string,
        private options: InvokerOptions = {}) {
        this.typeRef.onDestroy(this);

    }
    order?: number | undefined;

    equals(target: OperationInvoker): boolean {
        if (!target) return false;
        if (target === this) return true;
        if (target.typeRef?.class !== this.typeRef?.class) return false;
        if (target.method !== this.method) return false;
        const ann = this.typeRef.class.getAnnotation();
        return (ann.static || ann.singleton) == true;
    }

    onDestroy(): void {
        this._typeRef = null!;
        this.options = null!;
        this._ctx = null!;
    }

    get typeRef(): ReflectiveRef<T> {
        return this._typeRef;
    }

    private _ctx?: InvocationContext;
    get context() {
        if (!this._ctx) {
            this._ctx = this.typeRef.getContext(this.method, this.options);
        }
        return this._ctx;
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
    invoke(context?: InvocationContext, arg?: object): T {
        let instance;

        if (context) {
            if (arg && isTypeObject(arg)) {
                instance = arg;
            } else {
                if (this.options.instance) {
                    instance = isFunction(this.options.instance) ? this.options.instance() : this.options.instance;
                }
            }
        } else {
            context = this.context;
        }

        return this.typeRef.class.invoke(this.method, context, instance);
    }

    /**
     * resolve args.
     * @param context 
     */
    resolveArguments(context?: InvocationContext): any[] {
        return this.typeRef.resolveArguments(this.method, context ?? this.context)
    }
}
