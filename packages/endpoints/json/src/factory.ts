// import { Injectable } from '@tsdi/ioc';
// import { Receiver, Sender, TransportFactory, TransportOpts } from '@tsdi/common';
// import { JsonReceiver } from './receiver';
// import { JsonDecoder } from './decoder';
// import { JsonEncoder } from './encoder';
// import { JsonSender } from './sender';



// @Injectable()
// export class JsonTransportFactory implements TransportFactory {

//     constructor(readonly encoder: JsonEncoder, readonly decorder: JsonDecoder) { }

//     createReceiver(options: TransportOpts): Receiver {
//         return new JsonReceiver(this.decorder, options)
//     }
//     createSender(options: TransportOpts): Sender {
//         return new JsonSender(this.encoder, options)
//     }

// }
