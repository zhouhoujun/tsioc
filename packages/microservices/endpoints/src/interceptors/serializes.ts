// import { hasProps, isNil, isString, isUndefined } from '@tsdi/ioc';
// import { HandlerFn, InterceptorFn, PipeTransform } from '@tsdi/core';
// import { HEAD, ENOENT, RequestInterceptorFn, RequestHandlerFn, Outgoing, PacketLengthException, Packet } from '@tsdi/common';
// import { TEXT_DECODER, toBuffer } from '@tsdi/transport';
// import { defer, map, of, throwError } from 'rxjs';
// import { AbstractRequestContext } from '../AbstractRequestContext';


// export const packetIfySerializeInterceptor: RequestInterceptorFn<AbstractRequestContext, Packet> = (input: AbstractRequestContext, next: RequestHandlerFn<AbstractRequestContext, Packet>, context: AbstractRequestContext) => {
//     return next(input, context)
//         .pipe(
//             map(pkg => {
//                 let payload: any;
//                 if (isUndefined(pkg.payload)) {
//                     const id = input.response.id ?? input.request.id;
//                     payload = pkg;
//                     pkg = { id };
//                 } else {
//                     payload = pkg.payload;
//                 }
//                 if (isString(payload)) {
//                     pkg.payload = payload = Buffer.from(payload);
//                 }
//                 if (payload && isNil(pkg.contentLength)) {
//                     pkg.contentLength = Buffer.byteLength(payload)
//                 }
//                 return pkg;
//             })
//         )
// }

// /**
//  * execption serialize
//  */
// export const execptionMessageSerializeInterceptor: RequestInterceptorFn<AbstractRequestContext> = (input: AbstractRequestContext, next: RequestHandlerFn<AbstractRequestContext>, context: AbstractRequestContext) => {
//     if (input.execption) {
//         const err = input.execption;

//         // first unset all headers
//         input.removeHeaders();

//         // then set those specified
//         if (err.headers) input.setHeader(err.headers);

//         let status: number = err.status || err.statusCode;

//         const statusAdapter = input.statusAdapter;
//         if (statusAdapter) {
//             // ENOENT support
//             if (ENOENT === err.code) status = statusAdapter.notFound;

//             // default to serverError
//             if (!statusAdapter.isStatus(status)) status = statusAdapter.serverError;
//         }

//         input.status = status;
//         // empty response.
//         if (statusAdapter?.isEmptyException(status)) {
//             return of(null);
//         }

//         // respond
//         let msg: any;
//         msg = err.message;

//         // force text/plain
//         input.type = 'text';
//         msg = msg ?? input.statusMessage ?? '';
//         if (!input.headersSent) {
//             input.length = Buffer.byteLength(msg);
//         }
//         return of(msg);
//     }
//     return next(input, context)
// }

// /**
//  * execption serialize
//  */
// export const execptionSerializeInterceptor: RequestInterceptorFn<AbstractRequestContext> = (input: AbstractRequestContext, next: RequestHandlerFn<AbstractRequestContext, Packet>, context: AbstractRequestContext) => {
//     if (input.execption) {

//         const err = input.execption;

//         // first unset all headers
//         input.removeHeaders();
//         input.body = null;

//         // then set those specified
//         if (err.headers) input.setHeader(err.headers);

//         let status: number = err.status || err.statusCode;


//         const statusAdapter = input.statusAdapter;
//         if (statusAdapter) {
//             // ENOENT support
//             if (ENOENT === err.code) status = statusAdapter.notFound;

//             // default to serverError
//             if (!statusAdapter.isStatus(status)) status = statusAdapter.serverError;
//         }

//         input.status = status;
//         input.statusMessage = err.message;

//         const id = input.response.id ?? input.request.id!;
//         const pkg = {
//             id
//         } as any;

//         if (status) {
//             pkg.statusCode = status;
//         }
//         // respond
//         // force text/plain
//         // input.type = 'text';
//         const message = err.message ?? input.statusMessage;
//         // input.length = Buffer.byteLength(message);
//         if (message) {
//             pkg.statusMessage = message;
//         }
//         // // empty response.
//         if (statusAdapter?.isEmptyException(status)) {
//             pkg.body = null;
//         } else {
//             pkg.body = message;
//         }

//         pkg.error = {
//             name: err.name,
//             status,
//             message
//         }

//         const msg = JSON.stringify(pkg, null, 2);
//         if (!input.headersSent) {
//             input.length = Buffer.byteLength(msg);
//         }
//         return of(msg);

//     }
//     return next(input, context)
// }

// /**
//  * empty status serialize
//  */
// export const emptyStatusSerializeInterceptor: RequestInterceptorFn<AbstractRequestContext> = (input: AbstractRequestContext, next: RequestHandlerFn<AbstractRequestContext, Packet>, context: AbstractRequestContext) => {
//     if (input.statusAdapter?.isEmpty(input.status)) {
//         const payload = input.body = null;
//         return of(payload)
//     }
//     return next(input, context)
// }

// /**
//  * head method
//  */
// export const headMethodSerializeInterceptor: RequestInterceptorFn<AbstractRequestContext> = (input: AbstractRequestContext, next: RequestHandlerFn<AbstractRequestContext, Packet>, context: AbstractRequestContext) => {
//     if (input.method?.toUpperCase() == HEAD) {
//         if (!input.headersSent && !input.headerAdapter.hasContentLength(input.response)) {
//             const length = input.length;
//             if (Number.isInteger(length)) input.length = length
//         }
//         return of(null)
//     }
//     return next(input, context)
// }

// /**
//  * no body
//  * @param input 
//  * @param next 
//  * @param context 
//  * @returns 
//  */
// export const noBodySerializeInterceptor: RequestInterceptorFn<AbstractRequestContext> = (input: AbstractRequestContext, next: RequestHandlerFn<AbstractRequestContext, Packet>, context: AbstractRequestContext) => {
//     if (input.body === null) {
//         if (input.explicitNullBody) {
//             input.headerAdapter.setContentType(input.response, null);
//             input.headerAdapter.setContentLength(input.response, null);
//             input.headerAdapter.setContentEncoding(input.response, null);
//             input.headerAdapter.setTransferEncoding(input.response, null);
//             return of(null)
//         }

//         const payload = input.statusMessage ?? String(input.status);
//         if (!input.headersSent) {
//             input.type = 'text';
//             input.length = Buffer.byteLength(payload)
//         }
//         return of(payload)

//     }
//     return next(input, context)
// }


// /**
//  * request context body lenght limit
//  * @param input 
//  * @param next 
//  * @param context 
//  * @returns 
//  */
// export const lengthLimitSerializeInterceptor: RequestInterceptorFn<AbstractRequestContext> = (input: AbstractRequestContext, next: RequestHandlerFn<AbstractRequestContext, Packet>, context: AbstractRequestContext) => {
//     if (!input.execption) {
//         const transport = context.transport as AbstractTransport;
//         const length = input.length;
//         const sizeLimit = transport.options.maxSize ?? transport.options.limit;
//         if (length && sizeLimit && length > sizeLimit) {
//             const btpipe = transport.injector.get<PipeTransform>('bytes-format');
//             return throwError(() => new PacketLengthException(`Packet length ${btpipe.transform(length)} great than max size ${btpipe.transform(sizeLimit)}`));
//         }
//     }
//     return next(input, context);
// }

// /**
//  * limited readable body to buffuer
//  */
// export const limitedReadableSerializeInterceptor: RequestInterceptorFn<AbstractRequestContext> = (input: AbstractRequestContext, next: RequestHandlerFn<AbstractRequestContext, Packet>, context: AbstractRequestContext) => {
//     if (input.streamAdapter.isReadable(input.body)) {
//         return defer(async () => {
//             const body = await toBuffer(input.body);
//             return body;
//         })
//     }
//     return next(input, context);
// }



// function parseToOutgoing(input: AbstractRequestContext): Outgoing {
//     const id = input.response.id ?? input.request.id;
//     const headers = input.headerAdapter.getHeaders(input.response);
//     const pkg = {
//         id
//     } as Outgoing;

//     if (input.status) {
//         pkg.statusCode = input.status;
//     }
//     if (input.statusMessage) {
//         pkg.statusMessage = input.statusMessage;
//     }

//     if (hasProps(headers)) {
//         pkg.headers = headers;
//     }

//     return pkg;
// }

// /**
//  * serialize header and readable body to two packet.
//  * @param input 
//  * @param next 
//  * @param context 
//  * @returns 
//  */
// export const headersReadableBodyInterceptor: RequestInterceptorFn<AbstractRequestContext> = (input: AbstractRequestContext, next: RequestHandlerFn<AbstractRequestContext, Packet>, context: AbstractRequestContext) => {
//     if (input.streamAdapter.isReadable(input.body)) {
//         let contentLength = input.length || 0;
//         const pkg = parseToOutgoing(input);
//         const id = pkg.id;

//         if (id) {
//             const idLen = input.transport.options.idLen ?? 2;
//             const idBuff = Buffer.alloc(idLen);
//             if (idLen > 4) {
//                 idBuff.write(id.toString());
//             } else {
//                 idBuff.writeUIntBE(id as number, 0, idLen);
//             }
//             input.body.unshift(idBuff);
//             contentLength += idLen;
//         }
//         return of(
//             {
//                 id,
//                 // headers,
//                 payload: JSON.stringify(pkg),
//             },
//             {
//                 id,
//                 // headers,
//                 payload: input.body,
//                 contentLength
//             })
//     }
//     return next(input, context);
// }

// /**
//  * request context servialize.
//  * @param input 
//  * @param next 
//  * @param context 
//  * @returns 
//  */
// export const contextSerializeBackend: RequestHandlerFn<AbstractRequestContext> = (input: AbstractRequestContext, context: AbstractRequestContext) => {

//     return defer(async () => {
//         const pkg = parseToOutgoing(input);

//         let body = input.body;
//         if (input.streamAdapter.isReadable(body)) {
//             body = await toBuffer(body);
//             body = context.get(TEXT_DECODER).decode(body);
//         }

//         pkg.body = body;
//         const payload = JSON.stringify(pkg, null, 2);
//         if (!input.headersSent) {
//             input.length = Buffer.byteLength(payload);
//         }
//         return payload;

//     });

// }

// /**
//  * request context servialize body only
//  * @param input 
//  * @param next 
//  * @param context 
//  * @returns 
//  */
// export const contextBodySerializeBackend: BackendFn<AbstractRequestContext> = (input: AbstractRequestContext, context: TransportContext) => {
//     if (input.streamAdapter.isJson(input.body)) {
//         const body = JSON.stringify(input.body);
//         if (!input.headersSent) {
//             input.length = Buffer.byteLength(body);
//         }
//         return of(body)
//     }
//     return of(input.body)
// }


