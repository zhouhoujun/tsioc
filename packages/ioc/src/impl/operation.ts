import { ClassType, Type } from '../types';
import { TypeReflect } from '../metadata/type';
import { EMPTY, isArray, isClassType, isFunction, isPlainObject, isPromise, isString, isTypeObject, isTypeReflect } from '../utils/chk';
import { getClassName } from '../utils/lang';
import { Token } from '../tokens';
import { get } from '../metadata/refl';
import { ProviderType } from '../providers';
import { Parameter } from '../resolver';
import { InvocationContext, InvocationOption, InvokeArguments, InvokeOption } from '../context';
import { OperationFactory, OperationFactoryResolver, OperationInvoker } from '../operation';
import { Injector, MethodType } from '../injector';


/**
 * reflective.
 */
export class Reflective {
    constructor() {
    }

    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param typeRef target type reflect.
     * @param method invoke the method named with.
     * @param context the context to use to invoke the operation
     * @param destroy destroy the context after invoked.
     */
    invoke<T>(typeRef: TypeReflect<T>, method: string, context: InvocationContext, instance: T, destroy?: boolean | Function) {
        const type = typeRef.type;
        const inst: any = instance ?? context.resolve(type);
        if (!instance || !isFunction(inst[method])) {
            throw new Error(`type: ${type} has no method ${method}.`);
        }
        const hasPointcut = inst[method]['_proxy'] == true;
        const args = this.resolveArguments(typeRef, method, context);
        if (hasPointcut) {
            args.push(context);
        }
        let result = inst[method](...args);
        if (destroy && !hasPointcut) {
            if (isPromise(result)) {
                return result.then(val => {
                    isFunction(destroy) ? destroy() : context?.destroy();
                    return val;
                }) as any;
            } else {
                isFunction(destroy) ? destroy() : context?.destroy();
            }
        }
        return result;
    }

    /**
     * resolve args.     
     * @param typeRef target type reflect.
     * @param method invoke the method named with.
     * @param context invocation context.
     */
    resolveArguments<T>(typeRef: TypeReflect<T>, method: string, context: InvocationContext): any[] {
        const parameters = this.getParameters(typeRef, method);
        this.validate(typeRef, method, context, parameters);
        return parameters.map(p => this.resolveArgument(p, context));
    }

    protected resolveArgument(parameter: Parameter, context: InvocationContext) {
        return context.resolveArgument(parameter);
    }

    protected getParameters(typeRef: TypeReflect, method: string): Parameter[] {
        return typeRef.class.getParameters(method) as Parameter[] ?? EMPTY;
    }

    protected validate(typeRef: TypeReflect, method: string, context: InvocationContext, parameters: Parameter[]) {
        const missings = parameters.filter(p => this.isisMissing(context, p));
        if (missings.length) {
            throw new MissingParameterError(missings, typeRef.type, method);
        }
    }

    protected isisMissing(context: InvocationContext, parameter: Parameter) {
        return !context.canResolve(parameter);
    }
}

/**
 * global Reflective. instance of {@link Reflective}
 */
export const REFLECTIVE = new Reflective();

/**
 * reflective operation invoker.
 * implements {@link OperationInvoker}
 */
export class ReflectiveOperationInvoker implements OperationInvoker {

    constructor(
        private typeRef: TypeReflect,
        private method: string,
        private instance?: any,
        private reflective: Reflective = REFLECTIVE) {
    }

    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param destroy destroy the context after invoked.
     */
    invoke(context: InvocationContext, destroy?: boolean | Function) {
        return this.reflective.invoke(this.typeRef, this.method, context, this.instance, destroy);
    }

    /**
     * resolve args.
     * @param context 
     */
    resolveArguments(context: InvocationContext): any[] {
        return this.reflective.resolveArguments(this.typeRef, this.method, context);
    }
}


/**
 * Missing argument errror.
 */
export class MissingParameterError extends Error {
    constructor(parameters: Parameter[], type: ClassType, method: string) {
        super(`ailed to invoke operation because the following required parameters were missing: [ ${parameters.map(p => object2string(p)).join(',\n')} ], method ${method} of class ${object2string(type)}`);
        Object.setPrototypeOf(this, MissingParameterError.prototype);
        Error.captureStackTrace(this);
    }
}


export class DefaultOperationFactory<T> extends OperationFactory<T> {

    private _tagPdrs: ProviderType[] | undefined;
    private _type: Type<T>;
    readonly context: InvocationContext;
    constructor(readonly reflect: TypeReflect<T>, readonly injector: Injector, options?: InvokeArguments, protected reflective: Reflective = REFLECTIVE) {
        super()
        this._type = reflect.type as Type<T>;
        this.context = this.createContext(injector, options);
        this.context.setValue(OperationFactory, this);
        injector.onDestroy(this);
    }

    protected createReflective(): Reflective {
        return REFLECTIVE;
    }

    get type(): Type<T> {
        return this._type;
    }

    resolve(): T;
    resolve<R>(token: Token<R>): R;
    resolve(token?: Token<any>): any {
        return this.context.resolveArgument({ provider: token ?? this.type, nullable: true });
    }

    invoke(method: MethodType<T>, option?: InvokeOption | InvocationContext, instance?: T) {
        const [context, key, destroy] = this.createMethodContext(method, option);
        return this.reflective.invoke(this.reflect, key, context, instance ?? this.resolve(), destroy);
    }

    resolveArguments(method: MethodType<T>, option?: InvokeOption | InvocationContext) {
        const [context, key, destroy] = this.createMethodContext(method, option);
        const args = this.reflective.resolveArguments(this.reflect, key, context);
        if (destroy) {
            if (isFunction(destroy)) {
                destroy()
            } else {
                context.destroy();
            }
        }
        return args;
    }

    protected createMethodContext(method: MethodType<T>, option?: InvokeOption | InvocationContext): [InvocationContext, string, boolean | Function | undefined] {
        const key = isFunction(method) ? this.reflect.class.getPropertyName(method(this.reflect.class.getPropertyDescriptors() as any)) : method;
        let context: InvocationContext;
        let destroy: boolean | Function | undefined;
        if (option instanceof InvocationContext) {
            context = option;
            const refctx = this.createContext({ invokerMethod: key });
            context.addRef(refctx);
            destroy = () => {
                context.removeRef(refctx);
                refctx.destroy();
            }
        } else {
            context = option?.context ? option.context : this.createContext({ ...option, invokerMethod: key });
            if (option?.context) {
                const refctx = this.createContext({ ...option, invokerMethod: key });
                context.addRef(refctx);
                destroy = () => {
                    context.removeRef(refctx);
                    refctx.destroy();
                }
            } else {
                destroy = true;
            }
        }
        return [context, key, destroy];
    }

    createInvoker(method: string, instance?: T): OperationInvoker {
        return new ReflectiveOperationInvoker(this.reflect, method, instance, this.reflective);
    }

    createContext(parent?: Injector | InvocationContext | InvocationOption, option?: InvocationOption): InvocationContext<any> {
        let root: InvocationContext | undefined;
        let injector: Injector;
        if (parent instanceof Injector) {
            injector = parent;
        } else if (parent instanceof InvocationContext) {
            injector = parent.injector;
            root = parent;
        } else {
            injector = this.injector;
            root = this.context;
            option = parent;
        }

        if (!this._tagPdrs) {
            this._tagPdrs = injector.platform().getTypeProvider(this.reflect);
        }
        let providers = option?.providers;
        let resolvers = option?.resolvers;
        if (!root) {
            providers = providers ? this._tagPdrs.concat(providers) : this._tagPdrs;
            resolvers = resolvers ? this.reflect.class.resolvers.concat(resolvers) : this.reflect.class.resolvers;
        }
        const method = option?.invokerMethod;
        if (method) {
            const mthpdrs = this.reflect.class.getMethodProviders(method);
            providers = (providers && mthpdrs) ? providers.concat(mthpdrs) : (providers ?? mthpdrs);

            const mthrsv = this.reflect.class.getMethodResolvers(method);
            resolvers = (resolvers && mthrsv) ? resolvers.concat(mthrsv) : (resolvers ?? mthrsv);
        }

        return InvocationContext.create(injector, {
            ...option,
            parent: root ?? option?.parent,
            invokerTarget: this.reflect.type,
            providers,
            resolvers
        });
    }

    onDestroy(): void | Promise<void> {
        this._type = null!;
        this._tagPdrs = null!;
        this.reflective = null!;
        (this as any).injector = null!;
        (this as any).reflect = null!;
        return this.context?.destroy();
    }
}

export class DefaultOperationFactoryResolver extends OperationFactoryResolver {
    resolve<T>(type: ClassType<T> | TypeReflect<T>, injector: Injector, option?: InvokeArguments): OperationFactory<T> {
        return new DefaultOperationFactory(isFunction(type) ? get(type) : type, injector, option);
    }
}


const deft = {
    typeInst: true,
    fun: true
}

/**
 * format object to string for log.
 * @param obj 
 * @returns 
 */
export function object2string(obj: any, options?: { typeInst?: boolean; fun?: boolean; }): string {
    options = { ...deft, ...options };
    if (isArray(obj)) {
        return `[${obj.map(v => object2string(v, options)).join(', ')}]`;
    } else if (isString(obj)) {
        return `"${obj}"`;
    } else if (isClassType(obj)) {
        return 'Type<' + getClassName(obj) + '>';
    } else if (isTypeReflect(obj)) {
        return `[${obj.class.className} TypeReflect]`;
    } else if (isPlainObject(obj)) {
        let str: string[] = [];
        for (let n in obj) {
            let value = obj[n];
            str.push(`${n}: ${object2string(value, options)}`)
        }
        return `{ ${str.join(', ')} }`;
    } else if (options.typeInst && isTypeObject(obj)) {
        let fileds = Object.keys(obj).filter(k => k).map(k => `${k}: ${object2string(obj[k], { typeInst: false, fun: false })}`);
        return `[${getClassName(obj)} {${fileds.join(', ')}} ]`;
    }
    if (!options.fun && isFunction(obj)) {
        return 'Function';
    }
    return `${obj}`;
}
