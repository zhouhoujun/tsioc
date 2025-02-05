// import { Injectable } from '@tsdi/ioc';
// import { EncodeHandler } from '@tsdi/common/codings';
// import { TransportContext, PayloadEncoder } from '@tsdi/common/transport';
// import { ClientTransport } from '@tsdi/common/client';
// import { HttpRequest } from '@tsdi/common/http';



// @Injectable({ static: true })
// export class HttpClientCodingsHandlers {

//     constructor(private payloadEncoder: PayloadEncoder) { }


//     @EncodeHandler(HttpRequest)
//     async handleRequest(req: HttpRequest<any>, context: TransportContext) {
//         const session = context.transport as ClientTransport;
//         const data = await this.payloadEncoder.encode(session.streamAdapter, session.headerAdapter, req.body, req.headers, session.options.encoding);
//         return session.messageFactory?.create({ ...req.serialize(), data })
//     }

// }