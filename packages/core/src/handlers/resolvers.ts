import { ArgumentException, AbstractType, getType, isArray, isBasic, isDefined, isPrimitiveType, isString, Parameter, Empty, ResolveInterceptorLike, ContextToken, HandlerScope, Platform } from '@tsdi/ioc';
import { getPipe, ParameterScope, TransportParameter } from './resolver';
import { HandleContext } from './context';


export function missingPipeException<T>(parameter: Parameter<T>, type?: AbstractType, method?: string | symbol) {
    return new ArgumentException(`missing pipe to transform argument ${parameter.name} type, method ${method?.toString()} of class ${type}`)
}


// const TOKER_RESOLVER = new ContextToken<HandlerScope>(() => null!);
// export function getPayloadResolver(platform: Platform): HandlerScope<[any, TransportParameter], HandleContext> {
//     let scope = platform.context.get(TOKER_RESOLVER);
//     if (!scope) {
//         scope = new HandlerScope<[any, TransportParameter], HandleContext>(
//             platform,
//             (input, context) => undefined,
//             [
//                 (input, next, context) => {
//                     if (context.has(input[0], input[1])) {
//                         return context.get(input[0], input[1])
//                     }
//                     return next(input, context);
//                 },
//                 (input, next, context) => {
//                     const type = input[0]
//                     if (!isType(type) || getDef(type).abstract) {
//                         return next(input, context);
//                     }
//                     const injector = context.injector.parent ?? context.injector;
//                     injector.register(type);
//                     return context.get(type, input[1])
//                 },


//             ]
//         );
//         platform.context.set(TOKER_RESOLVER, scope);
//     }
//     return scope;
// }


export function createPayloadResolver<T extends HandleContext>(getPayload: (ctx: T, scope?: ParameterScope, filed?: string) => any, canResolve: <TP>(param: TransportParameter<TP>, payload: any, ctx: T) => boolean): ResolveInterceptorLike<TransportParameter, T>[] {
    return [
        (parameter, next, ctx) => {
            const payload = getPayload(ctx, parameter.scope, parameter.field ?? parameter.name);
            if (isDefined(payload)) {
                const pipe = getPipe(parameter, ctx, true);
                if (!pipe) throw missingPipeException(parameter, ctx.targetType, ctx.propertyKey)
                return pipe.transform(payload, ...parameter.args || Empty)
            }

            return next(parameter, ctx);
        },
        // composeResolver<T, TransportParameter>(
        //     (parameter, ctx) => canResolve(parameter, getPayload(ctx), ctx),
        //     composeResolver<T, TransportParameter>(
        //         (parameter, ctx) => isPrimitiveType(parameter.type),
        //         {
        //             canResolve(parameter, ctx) {
        //                 return isDefined(getPayload(ctx as T, parameter.scope, parameter.field ?? parameter.name))
        //             },
        //             resolve(parameter, ctx) {
        //                 const pipe = getPipe(parameter, ctx, true);
        //                 if (!pipe) throw missingPipeException(parameter, ctx.targetType, ctx.propertyKey)
        //                 return pipe.transform(getPayload(ctx as T, parameter.scope, parameter.field ?? parameter.name), ...parameter.args || Empty)
        //             }
        //         },
        //         {
        //             canResolve(parameter, ctx) {
        //                 const val = getPayload(ctx as T, parameter.scope);
        //                 return !parameter.field && (isBasic(val) || parameter.type == getType(val))
        //             },
        //             resolve(parameter: TransportParameter, ctx) {
        //                 const pipe = getPipe(parameter, ctx, true);
        //                 if (!pipe) throw missingPipeException(parameter, ctx.targetType, ctx.propertyKey)
        //                 return pipe.transform(getPayload(ctx as T, parameter.scope), ...parameter.args || Empty)
        //             }
        //         }
        //     ) ,
        //     composeResolver<T, TransportParameter>(
        //         (parameter) => isPrimitiveType(parameter.provider) && (parameter.multi === true || parameter.type === Array),
        //         {
        //             canResolve(parameter, ctx) {
        //                 return isList(getPayload(ctx as T, parameter.scope, parameter.field ?? parameter.name))
        //             },
        //             resolve(parameter, ctx) {
        //                 const value = getPayload(ctx as T, parameter.scope, parameter.field ?? parameter.name);
        //                 const values: any[] = isString(value) ? value.split(',') : value;
        //                 const pipe = getPipe(parameter, ctx, true);
        //                 if (!pipe) throw missingPipeException(parameter, ctx.targetType, ctx.propertyKey)
        //                 return values.map(val => pipe.transform(val, ...parameter.args || Empty)) as any
        //             }
        //         }
        //     ),
        //     {
        //         canResolve(parameter, ctx) {
        //             return isDefined(parameter.pipe) && isDefined(getPayload(ctx as T, parameter.scope, parameter.field))
        //         },
        //         resolve(parameter, ctx) {
        //             const value = getPayload(ctx as T, parameter.scope, parameter.field);
        //             const pipe = getPipe(parameter, ctx);
        //             if (!pipe) throw missingPipeException(parameter, ctx.targetType, ctx.propertyKey)
        //             return pipe.transform(value, ...parameter.args || Empty)
        //         }
        //     },
        //     {
        //         canResolve(parameter, ctx) {
        //             return parameter.nullable === true
        //         },
        //         resolve(parameter, ctx) {
        //             return null!
        //         }
        //     }
        // )
    ];
}


/**
 * is list or not.
 * @param target 
 * @returns 
 */
export function isList(target: any) {
    return isArray(target) || isString(target);
}