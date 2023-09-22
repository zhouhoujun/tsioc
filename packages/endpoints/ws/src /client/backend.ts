// import { Execption, Injectable } from '@tsdi/ioc';
// import { TransportRequest, TransportEvent, Receiver, Sender, Packet, TransportErrorResponse, TransportHeaderResponse, TransportResponse, ResHeaders, OutgoingHeaders } from '@tsdi/common';
// import { TransportBackend } from '@tsdi/common/client';
// import { Observable, catchError, filter, map, mergeMap, of } from 'rxjs';
// import { NumberAllocator } from 'number-allocator';


// @Injectable()
// export class WsBackend implements TransportBackend {

//     allocator?: NumberAllocator;
//     last?: number;

//     constructor() { }

//     handle(req: TransportRequest): Observable<TransportEvent> {

//         const url = this.getReqUrl(req);

//         const id = this.getPacketId();
//         const pkg = this.toPacket(id, url, req);
//         const sender = req.context.get(Sender);
//         const receiver = req.context.get(Receiver);

//         return sender.send(pkg)
//             .pipe(
//                 mergeMap(r => receiver.packet.pipe(
//                     filter(p => p.id == id),
//                     map(p=> {
//                         return this.createResponse(p as any);
//                     })
//                 )),
//                 catchError((err, caught) => {
//                     return of(this.createErrorResponse({ url, error: err, status: err.status ?? err.statusCode, statusText: err.message }))
//                 })
//             );

//     }

//     createErrorResponse(options: { url?: string | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status: number | string; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): TransportEvent {
//         return new TransportErrorResponse(options);
//     }
//     createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status: number | string; statusText?: string | undefined; statusMessage?: string | undefined; }): TransportEvent {
//         return new TransportHeaderResponse(options);
//     }
//     createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status: number | string; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; }): TransportEvent {
//         return new TransportResponse(options);
//     }

//     protected getReqUrl(req: TransportRequest) {
//         return req.urlWithParams;
//     }

//     protected toPacket(id: number | string, url: string, req: TransportRequest) {
//         const pkg = {
//             id,
//             method: req.method,
//             headers: req.headers.getHeaders(),
//             url,
//             payload: req.body
//         } as Packet;

//         return pkg;
//     }

//     protected getPacketId(): string | number {
//         if (!this.allocator) {
//             this.allocator = new NumberAllocator(1, 65536)
//         }
//         const id = this.allocator.alloc();
//         if (!id) {
//             throw new Execption('alloc stream id failed');
//         }
//         this.last = id;
//         return id;
//     }
// }
