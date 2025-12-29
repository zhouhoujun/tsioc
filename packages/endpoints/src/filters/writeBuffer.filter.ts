// import { RequestContext, RequestFilterFn, RequestHandlerFn, StreamAdapter, writePacket } from '@tsdi/common';
// import { mergeMap } from 'rxjs';
// import { SOCKET } from '@tsdi/common/transport';





// export const writeBufferFilter: RequestFilterFn = (req: any, next: RequestHandlerFn, context: RequestContext) => {
//     return next(req, context)
//         .pipe(
//             mergeMap(async res => {
//                 if (!res) return;
//                 // if (isObservable(res)) {
//                 //     res = await lastValueFrom(res);
//                 // }
//                 const socket = context.get(SOCKET);
//                 const streamAdapter = context.get(StreamAdapter);
//                 return await writePacket(socket, res, streamAdapter);
//             })
//         )
// }

