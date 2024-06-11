// import { Injectable } from '@tsdi/ioc';
// import { Filter, Handler } from '@tsdi/core';
// import { Message, Packet } from '@tsdi/common';
// import { CodingMappings, CodingsNotHandleExecption } from '@tsdi/common/codings';
// import { OutgoingPacket } from '@tsdi/common/transport';
// import { Observable, catchError, mergeMap, throwError } from 'rxjs';
// import { RequestContext } from '../RequestContext';



// @Injectable()
// export class OutgoingEncodeFilter implements Filter<RequestContext, Message> {
//     constructor(private codings: CodingMappings) { }

//     intercept(input: RequestContext, next: Handler<Packet, Message>, context: any): Observable<Message> {
//         return this.codings.encode(input, context)
//             .pipe(
//                 catchError(err => {
//                     if (err instanceof CodingsNotHandleExecption && err.target instanceof RequestContext && err.target.response instanceof OutgoingPacket) {
//                         return this.codings.encodeType(RequestContext, err.target, err.codingsContext);
//                     }
//                     return throwError(() => err)
//                 }),
//                 mergeMap(pkg => {
//                     return next.handle(pkg, context);
//                 })
//             )
//     }

// }