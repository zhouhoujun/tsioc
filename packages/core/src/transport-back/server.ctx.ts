// import {
//     Abstract, Token, Type, ClassType, composeResolver, isArray, isDefined, isPrimitiveType, isString, Injector,
//     InvokeArguments, MissingParameterExecption, Parameter, EMPTY, OperationArgumentResolver, BASE_RESOLVERS
// } from '@tsdi/ioc';
// import { MODEL_RESOLVERS } from './model';
// import { PipeTransform } from '../pipes/pipe';
// import { AssetContext, ServerEndpointContext } from './context';
// import { MessageArgumentExecption, MessageMissingExecption } from '../execptions';
// import { TransportArgumentResolver, TransportParameter } from './resolver';
// import { Server } from './server';
// import { Incoming, Outgoing } from './packet';
// import { StatusFactory } from './status';


// /**
//  * server context options.
//  */
// export interface ServerContextOpts extends InvokeArguments {

// }

// /**
//  * server context with model reovlers.
//  */
// @Abstract()
// export abstract class ServerContext<TRequest extends Incoming = Incoming, TResponse extends Outgoing = Outgoing> extends AssetContext<TRequest, TResponse> {

//     readonly statusFactory: StatusFactory<string | number>;
//     constructor(injector: Injector, public request: TRequest, readonly response: TResponse, readonly target: Server, options?: ServerContextOpts) {
//         super(injector, options);
//         this.statusFactory = injector.get(StatusFactory);
//     }

//     protected override getDefaultResolvers(): OperationArgumentResolver[] {
//         return [
//             ...primitiveResolvers,
//             ...this.injector.get(MODEL_RESOLVERS, EMPTY),
//             ...BASE_RESOLVERS
//         ];
//     }

//     protected isSelf(token: Token) {
//         return token === ServerEndpointContext || token === ServerContext;
//     }

//     protected override missingExecption(missings: Parameter<any>[], type: ClassType<any>, method: string): MissingParameterExecption {
//         throw new MessageMissingExecption(missings, type, method)
//     }

// }



// export function missingPipeExecption(parameter: Parameter, type?: ClassType, method?: string) {
//     return new MessageArgumentExecption(`missing pipe to transform argument ${parameter.name} type, method ${method} of class ${type}`)
// }

// const primitiveResolvers: TransportArgumentResolver[] = [
//     composeResolver<TransportArgumentResolver, TransportParameter>(
//         (parameter, ctx) => ctx instanceof ServerEndpointContext && isDefined(parameter.field ?? parameter.name),
//         composeResolver<TransportArgumentResolver>(
//             (parameter, ctx) => isPrimitiveType(parameter.type),
//             {
//                 canResolve(parameter, ctx) {
//                     return parameter.scope === 'query' && isDefined(ctx.query[parameter.field ?? parameter.name!])
//                 },
//                 resolve(parameter, ctx) {
//                     const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.type as Type)?.name.toLowerCase())!;
//                     if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
//                     return pipe.transform(ctx.query[parameter.field ?? parameter.name!], ...parameter.args || EMPTY)
//                 }
//             },
//             {
//                 canResolve(parameter, ctx) {
//                     return parameter.scope === 'restful' && ctx.restfulParams && isDefined(ctx.restfulParams[parameter.field ?? parameter.name!])
//                 },
//                 resolve(parameter, ctx) {
//                     const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.type as Type)?.name.toLowerCase());
//                     if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
//                     return pipe.transform(ctx.restfulParams[parameter.field ?? parameter.name!], ...parameter.args || EMPTY)
//                 }
//             },
//             {
//                 canResolve(parameter, ctx) {
//                     return parameter.scope === 'body' && isDefined(ctx.payload[parameter.field ?? parameter.name!]);
//                 },
//                 resolve(parameter, ctx) {
//                     const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.type as Type)?.name.toLowerCase());
//                     if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
//                     return pipe.transform(ctx.payload[parameter.field ?? parameter.name!], ...parameter.args || EMPTY)
//                 }
//             },
//             {
//                 canResolve(parameter, ctx) {
//                     const field = parameter.field ?? parameter.name!;
//                     return !parameter.scope && isDefined(ctx.query[field] ?? ctx.restfulParams?.[field] ?? ctx.payload?.[field])
//                 },
//                 resolve(parameter, ctx) {
//                     const field = parameter.field ?? parameter.name!;
//                     const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.type as Type)?.name.toLowerCase());
//                     if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
//                     return pipe.transform(ctx.query[field] ?? ctx.restfulParams?.[field] ?? ctx.payload[field], ...parameter.args || EMPTY)
//                 }
//             }
//         ),
//         composeResolver<TransportArgumentResolver, TransportParameter>(
//             (parameter) => isPrimitiveType(parameter.provider) && (parameter.mutil === true || parameter.type === Array),
//             {
//                 canResolve(parameter, ctx) {
//                     const field = parameter.field ?? parameter.name!;
//                     return parameter.scope === 'query' && (isArray(ctx.query[field]) || isString(ctx.query[field]))
//                 },
//                 resolve(parameter, ctx) {
//                     const value = ctx.payload[parameter.field ?? parameter.name!];
//                     const values: any[] = isString(value) ? value.split(',') : value;
//                     const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase())!;
//                     if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
//                     return values.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any
//                 }
//             },
//             {
//                 canResolve(parameter, ctx) {
//                     return parameter.scope === 'restful' && ctx.restfulParams && isDefined(ctx.restfulParams[parameter.field ?? parameter.name!])
//                 },
//                 resolve(parameter, ctx) {
//                     const value = (ctx.restfulParams[parameter.field ?? parameter.name!] as string).split(',');
//                     const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
//                     if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
//                     return value.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any
//                 }
//             },
//             {
//                 canResolve(parameter, ctx) {
//                     return isArray(ctx.payload[parameter.field ?? parameter.name!])
//                 },
//                 resolve(parameter, ctx) {
//                     const value: any[] = ctx.payload[parameter.field ?? parameter.name!];
//                     const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
//                     if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
//                     return value.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any
//                 }
//             }
//         ),
//         {

//             canResolve(parameter, ctx) {
//                 return isDefined(parameter.pipe) && parameter.scope === 'body'
//                     && (parameter.field ? ctx.payload[parameter.field] : Object.keys(ctx.payload).length > 0)
//             },
//             resolve(parameter, ctx) {
//                 const value = parameter.field ? ctx.payload[parameter.field] : ctx.payload;
//                 const pipe = ctx.get<PipeTransform>(parameter.pipe!);
//                 if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
//                 return pipe.transform(value, ...parameter.args || EMPTY)
//             }
//         },
//         {
//             canResolve(parameter, ctx) {
//                 return parameter.nullable === true
//             },
//             resolve(parameter, ctx) {
//                 return null!
//             }
//         }
//     )
// ];
