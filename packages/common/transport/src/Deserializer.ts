// import { Abstract, Injectable, Injector, InvocationContext, isString, tokenId } from '@tsdi/ioc';
// import { ConfigableHandlerOptions, ExceptionHandlerFilter, FilterLike, InterceptorLike, InvalidJsonException } from '@tsdi/core';
// import { createRequestHandler, RequestContext, RequestHandler } from '@tsdi/common';
// import { defer, Observable, of } from 'rxjs';
// import { TEXT_DECODER } from './context';
// import { isBuffer, toBuffer } from './StreamAdapter';
// import { XSSI_PREFIX } from './utils';
// import { Transport } from './Transport';

// @Abstract()
// export abstract class Deserializer<TIn = any, TOut = any> {
//     abstract deserialize(input: TIn, context: RequestContext): Observable<TOut>;
// }

// /**
//  * deserializer options
//  */
// export interface DeserializerOpts extends ConfigableHandlerOptions {

// }


// @Abstract()
// export abstract class DeserializerFactory {
//     abstract create(context: Injector | InvocationContext, options?: DeserializerOpts): Deserializer;
// }



// export class DefaultDeserializer<TIn = any, TOut = any> implements Deserializer<TIn, TOut> {
//     constructor(
//         private handler: RequestHandler<TIn, TOut>
//     ) { }

//     deserialize(input: TIn, context: RequestContext): Observable<TOut> {
//         return this.handler.handle(input, context);
//     }

// }

// export const DESERIALIZER_INTERCEPTORS = tokenId<InterceptorLike[]>('DESERIALIZER_INTERCEPTORS');
// export const DESERIALIZER_FILTERS = tokenId<FilterLike[]>('DESERIALIZER_FILTERS');


// @Injectable()
// export class DefaultDeserializerFactory implements DeserializerFactory {
//     create(context: Injector | InvocationContext, options?: DeserializerOpts): Deserializer {
//         const handler = createRequestHandler(context, {
//             backend: jsonDeserializeBackend,
//             filtersToken: DESERIALIZER_FILTERS,
//             interceptorsToken: DESERIALIZER_INTERCEPTORS,
//             filters: [
//                 ExceptionHandlerFilter
//             ],
//             enableTypeChain: true,
//             ...options
//         }) as RequestHandler;
//         return new DefaultDeserializer(handler);
//     }
// }

// export const bodyDesrializeBackend = (input: any, context: RequestContext) => {
//     return of(input)
// }

// export const jsonDeserializeBackend = (input: any, context: RequestContext) => {
//     return defer(async () => {
//         let jsonSrc: string | undefined;
//         let pkg: any;
//         const transport = context.get(Transport);
//         if (isString(input)) {
//             jsonSrc = input
//         } else if (isBuffer(input)) {
//             jsonSrc = context.get(TEXT_DECODER).decode(input);
//         } else if (transport.streamAdapter.isReadable(input)) {
//             input = await toBuffer(input);
//             jsonSrc = context.get(TEXT_DECODER).decode(input);
//         }

//         if (jsonSrc) {
//             try {
//                 jsonSrc = jsonSrc.replace(XSSI_PREFIX, '');
//                 pkg = JSON.parse(jsonSrc)
//             } catch (err) {
//                 throw new InvalidJsonException(err, jsonSrc);
//             }
//         }
//         return pkg;
//     })
// };
