// import { Handler, Filter, HEAD } from '@tsdi/core';
// import { Injectable, isString } from '@tsdi/ioc';
// import { StatusVaildator, hdr, isBuffer } from '@tsdi/transport';
// import { mergeMap, Observable } from 'rxjs';
// import { HttpContext, HttpServResponse } from './context';

// @Injectable({ static: true })
// export class HttpFinalizeFilter extends Filter {

//     constructor(private vaildator: StatusVaildator) {
//         super()
//     }

//     intercept(context: HttpContext, next: Handler<any, any>): Observable<any> {
//         return next.handle(context)
//             .pipe(
//                 mergeMap(res => {
//                     return this.respond(context)
//                 })
//             )
//     }

//     protected async respond(ctx: HttpContext): Promise<any> {

//         if (ctx.destroyed || !ctx.writable) return;

//         const res: HttpServResponse = ctx.response;

//         let body = ctx.body;
//         const status = ctx.status;

//         // ignore body
//         if (this.vaildator.isEmpty(status)) {
//             // strip headers
//             ctx.body = null;
//             return res.end()
//         }

//         if (HEAD === ctx.method) {
//             if (!res.headersSent && !res.hasHeader(hdr.CONTENT_LENGTH)) {
//                 const length = ctx.length;
//                 if (Number.isInteger(length)) ctx.length = length
//             }
//             return res.end()
//         }

//         // status body
//         if (null == body) {
//             if (ctx._explicitNullBody) {
//                 res.removeHeader(hdr.CONTENT_TYPE);
//                 res.removeHeader(hdr.CONTENT_LENGTH);
//                 res.removeHeader(hdr.TRANSFER_ENCODING);
//                 return res.end()
//             }
//             if (ctx.request.httpVersionMajor >= 2) {
//                 body = String(status)
//             } else {
//                 body = ctx.statusMessage || String(status)
//             }
//             body = Buffer.from(body);
//             if (!res.headersSent) {
//                 ctx.type = 'text';
//                 ctx.length = Buffer.byteLength(body)
//             }
//             return res.end(body)
//         }

//         // responses
//         if (isBuffer(body)) return res.end(body);
//         if (isString(body)) return res.end(Buffer.from(body));
//         if (isStream(body)) {
//             return await pipeStream(body, res);
//         }

//         // body: json
//         body = Buffer.from(JSON.stringify(body));
//         if (!res.headersSent) {
//             ctx.length = Buffer.byteLength(body)
//         }
//         res.end(body);
//         return res
//     }

// }
