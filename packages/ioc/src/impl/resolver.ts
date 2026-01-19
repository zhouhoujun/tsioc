import { Exception } from '../exception';
import { Context, ContextToken } from '../handlers/Context';
import { HandlerLike } from '../handlers/handler';
import { InterceptorLike } from '../handlers/interceptor';
import { Injector, InjectorRecord } from '../injector';
import { RuntimeHandler } from '../lifescope/handler';
import { getTypeName, isType } from '../metadata/type';
import { getDef } from '../metadata/type.def';
import { ClassRef } from '../metadata/class';
import { Parameter, ParameterLike, ResolveContext, ResolveHandler, Resolver } from '../resolver';
import { Runtime } from '../runtime';
import { InjectFlags, Token } from '../tokens';
import { AbstractType } from '../types';
import { isArray, isFunction, isNil, isString } from '../utils/chk';
import { isPlainObject, isTypeObject } from '../utils/obj';
import { resolveArgs, resolveParameters } from './common';
import { InjectUtil } from './injector';
import { invokeTail } from '../handlers/compose';


export class DefaultResolver implements Resolver {

    constructor(
        readonly handler: ResolveHandler
    ) { }

    resolve<T>(parameter: Parameter<T>, context: ResolveContext): T {
        const metaRvr = parameter.resolver;
        let handler = this.handler;
        if (metaRvr?.length) {
            handler = createResolveHandler(metaRvr.map(r => isType(r) ? context.getInjector().get(r) : r), this.handler);
        }

        return invokeTail(() => handler.handle(parameter, context),
            {
                next: (res) => {
                    if (res === UNRESOLVED) {
                        const failed = context.getFailed();
                        if (failed) {
                            failed(parameter.target, parameter.propertyKey!)
                        } else {
                            this.missingException([parameter], parameter.target, parameter.propertyKey!);
                        }
                        return null;
                    }
                    return res;
                },
                error: (error) => {
                    if (error instanceof Exception) {
                        throw error;
                    }
                    const failed = context.getFailed();
                    if (failed) {
                        failed(parameter.target, parameter.propertyKey!)
                    } else {
                        this.missingException([parameter], parameter.target, parameter.propertyKey!);
                    }
                }
            }
        ) as T;
    }

    resolveArgs(injector: Injector, args?: (ParameterLike | InjectorRecord)[], context?: ResolveContext): any[] {
        return resolveArgs(injector, args, context, this)
    }

    resolveParams(injector: Injector, params: Parameter[], context?: ResolveContext): any[] {
        return resolveParameters(injector, params, context, this)
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
    } else if (isType(obj)) {
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

// export function createResolveHandler(interceptors?: ResolveInterceptorLike[], backend?: ResolveHandlerLike | null): ResolveHandler {
//     return new RuntimeHandler(backend ?? unResolve, interceptors) 
// }
export function createResolveHandler<TInput, TOutput = any, TContext extends ResolveContext = ResolveContext>(interceptors?: InterceptorLike<TInput, TOutput, TContext>[], backend?: HandlerLike<TInput, TOutput, TContext> | null): RuntimeHandler<TInput, TOutput, TContext> {
    return new RuntimeHandler<TInput, TOutput, TContext>(backend ?? unResolve, interceptors)
}



function tryResolve(injector: Injector, token: Token, flags?: InjectFlags, context?: ResolveContext) {
    if(context?.has(token)) return context.get(token);

    if (injector.has(token, flags)) {
        return injector.get(token, UNRESOLVED, flags, context)
    }
    if (!isType(token) || getDef(token).abstract) {
        return UNRESOLVED;
    }
    if (!injector.has(token)) {
        InjectUtil.register(injector, token);
    }
    return injector.get(token, UNRESOLVED, flags, context);
}


const PARAMETER_RESOLVE_HANDLER = new ContextToken<RuntimeHandler<Parameter, any, ResolveContext>>(() => null!);
export function getParameterResolveHanlder(runtime: Runtime): RuntimeHandler<Parameter, any, ResolveContext> {
    let scope = runtime.get(PARAMETER_RESOLVE_HANDLER);
    if (!scope) {
        scope = new RuntimeHandler<Parameter, any, ResolveContext>(
            (input, context) => {
                const injector = context.getInjector();
                if (input.provider && !input.multi) {
                    const value = tryResolve(injector, input.provider, input.flags, context);
                    if (isResolved(value)) return value;
                } else if (!input.multi && input.name && injector.has(input.name, input.flags)) {
                    const value = injector.get(input.name, UNRESOLVED, input.flags);
                    if (isResolved(value)) return value;
                } else if (input.type) {
                    const value = tryResolve(injector, input.type, input.flags, context);
                    if (isResolved(value)) return value;
                }

                if (!isNil(input.defaultValue)) {
                    return input.defaultValue;
                }
                if (input.nullable === true || (input.flags && !!(input.flags & InjectFlags.Optional))) {
                    return null;
                }

                return UNRESOLVED;
            }
        );
        runtime.set(PARAMETER_RESOLVE_HANDLER, scope);
    }
    return scope;
}


