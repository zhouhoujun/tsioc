// import { Injectable } from '@tsdi/ioc';
// import {
//     ClientIncomingFactory, UrlClientIncomingOpts, UrlClientIncoming,
//     StreamAdapter,
//     parseUrlClientIncoming
// } from '@tsdi/common/transport';



// export class TcpClientIncoming<T, TStatus = null> extends UrlClientIncoming<T, TStatus> {

// }

// @Injectable()
// export class TcpClientIncomingFactory implements ClientIncomingFactory {

//     constructor(private streamAdapter: StreamAdapter){}

//     create<T = any>(options: UrlClientIncomingOpts<any, any>): UrlClientIncoming<T> {
//         if(this.streamAdapter.isReadable(options.payload)) {
//             return parseUrlClientIncoming(options);
//         }
//         return new TcpClientIncoming(options);
//     }

// }