// import { Injectable } from '@tsdi/ioc';
// import {
//     IncomingFactory, UrlIncomingOptions, UrlIncoming,
//     Incoming, OutgoingFactory, ServerOutgoing, OutgoingOpts,
//     StreamAdapter,
//     parseUrlIncoming
// } from '@tsdi/common/transport';


// @Injectable()
// export class TcpIncomingFactory implements IncomingFactory {

//     constructor(private streamAdapter: StreamAdapter) { }
//     create(options: UrlIncomingOptions): UrlIncoming<any> {
//         if (this.streamAdapter.isReadable(options.payload)) {
//             return parseUrlIncoming(options);
//         }
//         return new UrlIncoming(options);
//     }
// }




// export class TcpOutgoingFactory implements OutgoingFactory {
//     create<T>(incoming: Incoming<any>, options?: OutgoingOpts<T, any>): ServerOutgoing<T> {
//     }

// }