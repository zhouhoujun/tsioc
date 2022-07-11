// import { EndpointBackend, EndpointContext } from '@tsdi/core';
// import { Injectable } from '@tsdi/ioc';
// import { Observable } from 'rxjs';
// import { TcpRequest } from './request';
// import { TcpEvent } from './response';

// /**
//  * tcp backend.
//  */
// @Injectable()
// export class TcpBackend implements EndpointBackend<TcpRequest, TcpEvent> {

//     handle(req: TcpRequest, context: EndpointContext): Observable<TcpEvent> {
//         if (!context.target) return throwError(() => new TcpErrorResponse(0, 'has not connected.'));
//         const ctx = context as RequestContext;
//         const socket = this.socket;
//         let headers: Record<string, ResHeaderItemType>;
//         let body: any, error: any, ok = false;
//         let bodybuf = '';
//         let status: number;
//         let statusMessage = '';
//         let bodyType: string, bodyLen = 0;

//         const ac = this.getAbortSignal(ctx);
//         return new Observable((observer: Observer<any>) => {

//             const sub = defer(async () => {
//                 const encoder = ctx.get(Encoder);
//                 const buf = encoder.encode(req.serializeHeader());
//                 const split = ctx.get(TcpClientOptions).headerSplit;

//                 await writeSocket(socket, buf, split, this.option.encoding);

//                 if (isDefined(req.body)) {
//                     await writeSocket(socket, encoder.encode(req.serializeBody()), split, this.option.encoding)
//                 }
//             }).pipe(
//                 mergeMap(() => this.source),
//                 filter(pk => pk.id === req.id)
//             ).subscribe({
//                 complete: () => observer.complete(),
//                 error: (err) => observer.error(new TcpErrorResponse(err?.status ?? 500, err?.text, err ?? body)),
//                 next: (pk) => {
//                     if (pk.headers) {
//                         headers = pk.headers;
//                         bodyLen = headers[hdr.CONTENT_LENGTH] as number ?? 0;
//                         bodyType = headers[hdr.CONTENT_TYPE] as string;
//                         status = headers[hdr.STATUS] as number ?? 0;
//                         statusMessage = headers[hdr.STATUS_MESSAGE] as string;
//                         if (!bodyLen) {
//                             observer.next(new TcpResponse({
//                                 id: pk.id,
//                                 status,
//                                 statusMessage
//                             }));
//                             observer.complete();
//                         }
//                         return;
//                     }
//                     if (pk.body) {
//                         bodybuf += pk.body;
//                         if (bodyLen > Buffer.byteLength(bodybuf)) {
//                             return;
//                         }
//                     }
//                     body = bodybuf;

//                     let buffer: Buffer;
//                     let originalBody: string;
//                     switch (ctx.responseType) {
//                         case 'arraybuffer':
//                             buffer = Buffer.from(body);
//                             body = buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
//                             ok = true;
//                             break;
//                         case 'blob':
//                             buffer = Buffer.from(body);
//                             body = new Blob([buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)]);
//                             ok = true;
//                             break;
//                         case 'json':
//                             originalBody = body;
//                             try {
//                                 body = body.replace(XSSI_PREFIX, '');
//                                 // Attempt the parse. If it fails, a parse error should be delivered to the user.
//                                 body = body !== '' ? JSON.parse(body) : null
//                             } catch (err) {
//                                 // Since the JSON.parse failed, it's reasonable to assume this might not have been a
//                                 // JSON response. Restore the original body (including any XSSI prefix) to deliver
//                                 // a better error response.
//                                 body = originalBody;

//                                 // If this was an error request to begin with, leave it as a string, it probably
//                                 // just isn't JSON. Otherwise, deliver the parsing error to the user.
//                                 if (ok) {
//                                     // Even though the response status was 2xx, this is still an error.
//                                     ok = false;
//                                     // The parse error contains the text of the body that failed to parse.
//                                     error = { error: err, text: body } as ResponseJsonParseError
//                                 }
//                             }
//                             break;
//                     }


//                     if (ok) {
//                         observer.next(new TcpResponse({
//                             status,
//                             statusMessage,
//                             body
//                         }));
//                         observer.complete();
//                     } else {
//                         observer.error(new TcpErrorResponse(error?.status ?? 500, error?.text, error ?? body));
//                     }
//                 }
//             });

//             return () => {
//                 if (ac && !ctx.destroyed) {
//                     ac.abort()
//                 }
//                 sub && sub.unsubscribe();
//                 if (!ctx.destroyed) {
//                     observer.error(new TcpErrorResponse(0, 'The operation was aborted.'));
//                 }
//             }
//         });
//     }
// }
