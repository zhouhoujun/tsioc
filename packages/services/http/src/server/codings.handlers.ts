// import { Injectable } from '@tsdi/ioc';
// // import { PacketOpts } from '@tsdi/common';
// // import { DecodeHandler, EncodeHandler } from '@tsdi/common/codings';
// import { DeserializeContext, DeserializeHandler, PayloadEncoder, SerializeContext, SerializeHandler } from '@tsdi/common/transport';
// import { ServerTransport } from '@tsdi/endpoints';
// import { HttpIncomings } from './transport';
// import { HttpContext } from './context';


// @Injectable({ static: true })
// export class HttpCodingsHandlers {

//     constructor(private payloadEncoder: PayloadEncoder) { }

//     @DeserializeHandler(HttpIncomings)
//     handleIncoming(incoming: HttpIncomings, context: DeserializeContext) {
//         const session = context.transport as ServerTransport;
//         return session.requestContextFactory.create(session, incoming.req, incoming.res, session.serverOptions)
//     }


//     @SerializeHandler(HttpContext)
//     async handleContext(input: HttpContext, context: SerializeContext) {
//         const session = context.transport as ServerTransport;
//         const response = input.response;

//         const data = await this.payloadEncoder.encode(session.streamAdapter, session.headerAdapter, input.body, input.response.headers ?? input.response, session.options.encoding);
//         const packet = {
//             url: input.url,
//             id: response.id,
//             type: response.type,
//             status: response.statusCode,
//             statusMessage: response.statusMessage,
//             headers: input.response?.getHeaders() ?? input.response.headers,
//             data
//         };

//         // return packet;
//         return session.messageFactory?.create(packet)
//     }

// }
