// import { Injectable } from '@tsdi/ioc';
// import { AbstractIncoming, NotImplementedExecption, AbstractOutgoing } from '@tsdi/common/transport';
// import { RequestContext } from '../RequestContext';
// import { ServerTransport } from '../transport';




// @Injectable({ static: true })
// export class ServerEndpointCodingsHanlders {

//     @DeserializeHandler(AbstractIncoming)
//     decodePacket(context: DeserializeContext) {
//         const incoming = context.last<AbstractIncoming<any>>();
//         const session = context.transport as ServerTransport;
//         if (!session.outgoingFactory) throw new NotImplementedExecption('outgoingFactory');
//         const outgoing = session.outgoingFactory.create(incoming);

//         return session.requestContextFactory.create(session, incoming, outgoing, session.serverOptions);
//     }

//     @SerializeHandler(RequestContext)
//     encodePacket(context: SerializeContext) {
//         const reqContext = context.last<RequestContext>();
//         return (reqContext.response as AbstractOutgoing<any>).clone({ payload: reqContext.body });

//     }
// }
