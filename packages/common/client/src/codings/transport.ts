// import { HeaderAdapter, ResponseFactory } from '@tsdi/common';
// import { ClientIncomingFactory, ClientOutgoingFactory, Deserializer, Redirector, Serializer, StatusAdapter, StreamAdapter } from '@tsdi/common/transport';
// import { ClientTransport } from '../transport';
// import { ClientOpts } from '../options';



// export abstract class DefaultClientTransport extends ClientTransport<any> {

//     constructor(
//         readonly socket: any,
//         readonly serializer: Serializer,
//         readonly deserializer: Deserializer,
//         readonly headerAdapter: HeaderAdapter,
//         readonly streamAdapter: StreamAdapter,
//         readonly incomingFactory: ClientIncomingFactory,
//         readonly outgoingFactory: ClientOutgoingFactory,
//         readonly responseFactory: ResponseFactory,
//         readonly statusAdapter: StatusAdapter | null,
//         readonly redirector: Redirector | null,
//         readonly clientOptions: ClientOpts

//     ) {
//         super()
//     }

// }


// // @Injectable()
// // export class DefaultClientTransportFactory implements ClientTransportFactory<any> {

// //     constructor() { }

// //     create(injector: Injector, socket: IDuplexStream, options: ClientOpts): DefaultClientTransport {
// //         return new DefaultClientTransport(injector, socket, options);
// //     }

// // }