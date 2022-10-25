// import { Endpoint, IncomingHeaders, TransportOpts } from '@tsdi/core';
// import { ev } from '@tsdi/transport';
// import { Observable, Subscription } from 'rxjs';

// export class TcpReceiver extends Receiver {

//     constructor(options: ReceiverOpts) {
//         super();
//     }

//     receive(conn: any, endpoint: Endpoint<any, any>): Observable<any> {
//         return this.endpoint.handle(conn, )
//         // return new Observable((observer) => {
//         //     const subs: Set<Subscription> = new Set();

//         //     const onHeaders = (headers: IncomingHeaders, id: number) => {
//         //         const stream = this.createStream(conn, sid, headers);
//         //         conn.emit(ev.STREAM, stream, headers);
//         //     };


//         //     const onStream = (stream: ServerStream, headers: IncomingHeaders) => {
//         //         const ctx = this.buildContext(stream, headers);
//         //         subs.add(this.handle(ctx, this.endpoint(), observer));
//         //     };

//         //     conn.on(ev.HEADERS, onHeaders);
//         //     conn.on(ev.STREAM, onStream);
//         //     return () => {
//         //         subs.forEach(s => {
//         //             s && s.unsubscribe();
//         //         });
//         //         subs.clear();
//         //         conn.off(ev.HEADERS, onHeaders);
//         //         conn.off(ev.STREAM, onStream);
//         //     }
//         // });
//     }

// }