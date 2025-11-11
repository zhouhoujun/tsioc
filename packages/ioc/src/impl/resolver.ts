import { Exception } from '../exception';
import { ContextToken, HandlerLike, InterceptorLike } from '../handler';
import { RuntimeHandler } from '../lifescope/handler';
import { ClassRef } from '../metadata/class';
import { getDef } from '../metadata/refl';
import { Parameter, ResolveContext, Resolver } from '../resolver';
import { Runtime } from '../runtime';
import { InjectFlags, Token } from '../tokens';
import { AbstractType } from '../types';
import { isAbstractType, isArray, isFunction, isNil, isString, isType } from '../utils/chk';
import { getTypeName } from '../utils/lang';
import { isPlainObject, isTypeObject } from '../utils/obj';
import { Operator } from './injector';


export class DefaultResolver implements Resolver {

    readonly handler: RuntimeHandler<Parameter>;

    constructor(
        runtime: Runtime,
        handler?: RuntimeHandler<Parameter> | null
    ) {
        this.handler = handler ?? getParameterResolveHanlder(runtime);
    }

    resolve<T>(parameter: Parameter<T>, context: ResolveContext): T {
        const metaRvr = parameter.resolver;
        let handler = this.handler;
        if (metaRvr?.length) {
            handler = createResolveHandler(context.getRuntime(), metaRvr.map(r => isType(r) ? context.getInjector().get(r) : r), this.handler);
        }

        return handler.handle(parameter, context,
            {
                next: (res) => {
                    if (res === UNRESOLVED) {
                        if (context.failed) {
                            context.failed(context.getTarget()!, parameter.propertyKey!)
                        } else {
                            this.missingException([parameter], context.getTarget()!, parameter.propertyKey!);
                        }
                        return null;
                    }
                    return res;
                },
                error: (error) => {
                    if (error instanceof Error) {
                        throw error;
                    }
                    if (context.failed) {
                        context.failed(context.getTarget()!, parameter.propertyKey!)
                    } else {
                        this.missingException([parameter], context.getTarget()!, parameter.propertyKey!);
                    }
                }
            }
        ) as T;
    }

    protected missingException(missings: Partial<Parameter>[], type: AbstractType<any>, method: string): Exception {
        throw new MissingParameterException(missings, type, method)
    }

}


/**
 * Missing argument execption.
 */
export class MissingParameterException extends Exception {
    constructor(parameters: Partial<Parameter>[], type: AbstractType, method: string) {
        super(`ailed to invoke operation because the following required parameters were missing: [ ${parameters.map(p => object2string(p)).join(',\n')} ], method ${method} of class ${object2string(type)}`)
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
        return `[${obj.map(v => object2string(v, options)).join(', ')}]`
    } else if (isString(obj)) {
        return `"${obj}"`
    } else if (isAbstractType(obj)) {
        return 'Type<' + getTypeName(obj) + '>'
    } else if (obj instanceof ClassRef) {
        return `[${obj.className} TypeReflect]`
    } else if (isPlainObject(obj)) {
        const str: string[] = [];
        for (const n in obj) {
            const value = obj[n];
            str.push(`${n}: ${object2string(value, options)}`)
        }
        return `{ ${str.join(', ')} }`
    } else if (options.typeInst && isTypeObject(obj)) {
        const fileds = Object.keys(obj).filter(k => k).map(k => `${k}: ${object2string(obj[k], { typeInst: false, fun: false })}`);
        return `[${getTypeName(obj)} {${fileds.join(', ')}} ]`
    }
    if (!options.fun && isFunction(obj)) {
        return 'Function'
    }
    return `${obj?.toString()}`
}

const UNRESOLVED = {};
const unResolve = <TInput, TOutput = any, TContext = any>(input: TInput, context: TContext) => UNRESOLVED as TOutput;

export function isResolved(value: any) {
    return value !== UNRESOLVED;
}

export function createResolveHandler<TInput, TContext = any, TOutput = any>(runtime: Runtime, interceptors: InterceptorLike<TInput, TOutput, TContext>[], backend?: HandlerLike<TInput, TOutput, TContext> | null): RuntimeHandler<TInput, TContext, TOutput> {
    return new RuntimeHandler<TInput, TContext, TOutput>(runtime, backend ?? unResolve, interceptors)
}

const TOKER_RESOLVE_HANDLER = new ContextToken<RuntimeHandler<[Token, InjectFlags | undefined], ResolveContext>>(() => null!);
export function getTokenResolveHandler(runtime: Runtime): RuntimeHandler<[Token, InjectFlags | undefined], ResolveContext> {
    let scope = runtime.get(TOKER_RESOLVE_HANDLER);
    if (!scope) {
        scope = createResolveHandler(
            runtime,
            [
                (input, next, context) => {
                    const injector = context.getRaiseInjector() ?? context.getInjector();
                    if (injector.has(input[0], input[1])) {
                        return injector.get(input[0], null, input[1])
                    }
                    return next(input, context);
                },
                (input, next, context) => {
                    const [type, flags] = input
                    if (!isType(type) || getDef(type).abstract) {
                        return next(input, context);
                    }
                    const injector = context.getRaiseInjector() ?? context.getInjector();
                    if (!injector.has(type)) {
                        Operator.register(injector, type);

                    }
                    return injector.get(type, null, flags)
                },


            ]
        );
        runtime.set(TOKER_RESOLVE_HANDLER, scope);
    }
    return scope;
}

const PARAMETER_RESOLVE_HANDLER = new ContextToken<RuntimeHandler>(() => null!);
export function getParameterResolveHanlder(runtime: Runtime): RuntimeHandler<Parameter, ResolveContext> {
    let scope = runtime.get(PARAMETER_RESOLVE_HANDLER);
    if (!scope) {
        scope = createResolveHandler(
            runtime,
            [
                (input, next, context) => {
                    if (input.provider && !input.multi) {
                        const value = getTokenResolveHandler(runtime).handle([input.provider, input.flags], context);
                        if (isResolved(value)) return value;
                    } else if (!input.multi && input.name && context.has(input.name, input.flags)) {
                        return context.get(input.name, input.flags)
                    } else if (input.type) {
                        const value = getTokenResolveHandler(runtime).handle([input.type, input.flags], context);
                        if (isResolved(value)) return value;
                    }
                    return next(input, context);
                },
                (input, next, context) => {

                    if (!isNil(input.defaultValue)) {
                        return input.defaultValue;
                    }
                    if (input.nullable === true || (input.flags && !!(input.flags & InjectFlags.Optional))) {
                        return null;
                    }

                    return next(input, context);
                }
            ]
        );
        runtime.set(PARAMETER_RESOLVE_HANDLER, scope);
    }
    return scope;
}


