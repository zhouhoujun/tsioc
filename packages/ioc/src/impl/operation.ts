import { ClassType } from '../types';
import { TypeDef } from '../metadata/type';
import { AfterHook, AfterReturnningHook, BeforeHook, FinallyHook, InvocationContext } from '../context';
import { OperationInvoker } from '../operation';
import { isTypeObject } from '../utils/obj';



/**
 * reflective operation invoker.
 * implements {@link OperationInvoker}
 */
export class ReflectiveOperationInvoker<T = any> implements OperationInvoker<T> {

    private _returnType!: ClassType;
    constructor(
        private typeRef: TypeDef,
        private method: string,
        private instance?: any) {
    }

    get descriptor(): TypedPropertyDescriptor<T> {
        return this.typeRef.class.getDescriptor(this.method)
    }

    get returnType(): ClassType<T> {
        if (!this._returnType) {
            this._returnType = this.typeRef.class.getReturnning(this.method) ?? Object
        }
        return this._returnType
    }

    /**
    * before invoke.
    * @param hook 
    */
    before(hook: BeforeHook): void {

    }
    /**
     * after invoke.
     * @param hook 
     */
    after(hook: AfterHook): void {

    }
    
    private _returnnings?: ((ctx: InvocationContext, returnning: any) => void)[]
    /**
     * after returning hooks.
     */
    afterReturnning(hook: AfterReturnningHook): void {
        if (!this._returnnings) {
            this._returnnings = []
        }
        this._returnnings.push(hook)
    }

    /**
     * after throwing hooks.
     */
    afterThrowing(hook: AfterReturnningHook): void {

    }
    /**
     * finally hooks.
     */
    finally(hook: FinallyHook): void {

    }

    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param destroy destroy the context after invoked.
     */
    invoke(context: InvocationContext, destroy?: boolean | Function): T
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param destroy destroy the context after invoked.
     */
    invoke(context: InvocationContext, instance: object, destroy?: boolean | Function): T;
    invoke(context: InvocationContext, arg?: object | boolean | Function, destroy?: boolean | Function): T {
        if (arg && isTypeObject(arg)) {
            return this.typeRef.class.invoke(this.method, context, arg, destroy, this._returnnings ? this.runHooks : undefined)
        }
        return this.typeRef.class.invoke(this.method, context, this.instance, destroy, this._returnnings ? this.runHooks : undefined)
    }

    /**
     * resolve args.
     * @param context 
     */
    resolveArguments(context: InvocationContext): any[] {
        return this.typeRef.class.resolveArguments(this.method, context)
    }
}

