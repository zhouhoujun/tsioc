// import { Injectable } from '@tsdi/ioc';
// import { Handler, Interceptor } from '@tsdi/core';
// import { PatternFormatter, PatternRequest, UrlRequest } from '@tsdi/common';
// import { Codings, EncodeHandler } from '@tsdi/common/codings';
// import { TransportContext } from '@tsdi/common/transport';
// import { Observable, mergeMap } from 'rxjs';



// @Injectable({ static: true })
// export class RequestEncodingsHandlers {

//     @EncodeHandler(PatternRequest)
//     handlePatternRequest(req: PatternRequest) {
//         const packet = {
//             headers: req.headers,
//             payload: req.payload,
//             pattern: req.pattern,
//             params: req.params.toRecord(),
//             payloadLength: req.headers.getContentLength()
//         } as any;

//         if (!packet.url && req.pattern) {
//             packet.url = req.context.get(PatternFormatter).format(req.pattern);
//         }
//         if (req.method) {
//             packet.method = req.method;
//         }
//         return packet
//     }

//     @EncodeHandler(UrlRequest)
//     handleUrlRequest(req: UrlRequest) {
//         const packet = {
//             url: req.urlWithParams,
//             headers: req.headers,
//             payload: req.payload,
//             payloadLength: req.headers.getContentLength()
//         } as any;

//         if (req.method) {
//             packet.method = req.method;
//         }
//         return packet
//     }
// }


// @Injectable()
// export class RequestEncodeInterceper implements Interceptor<any, any, TransportContext> {

//     constructor(private codings: Codings) {
//     }

//     intercept(input: UrlRequest<any>, next: Handler<any, any, TransportContext>, context: TransportContext): Observable<any> {
//         return this.codings.encode(input, context)
//             .pipe(mergeMap(res => next.handle(res, context)));

//     }
// }


