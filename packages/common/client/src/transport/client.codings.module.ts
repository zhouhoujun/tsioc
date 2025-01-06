// import { getToken, Module } from '@tsdi/ioc';
// import { Interceptor } from '@tsdi/core';
// import { AbstractClientIncoming } from '@tsdi/common/transport';
// import {
//     CompressResponseInterceptor, EmptyResponseInterceptor, ErrorResponseInterceptor,
//     RedirectInterceptor, ResponseDeserializeInterceptor
// } from './response.deserialize';
// import { ClientBackend } from '../backend';
// import { ClientTransportBackend } from './transport.backend';
// // import { ClientEndpointCodingsHanlders } from './codings.handlers';


// const CLIENT_INCOMING_DECODE_INTERCEPTORS = getToken<Interceptor[]>(AbstractClientIncoming);

// @Module({
//     providers: [
//         { provide: ClientBackend, useClass: ClientTransportBackend, asDefault: true },
//         { provide: CLIENT_INCOMING_DECODE_INTERCEPTORS, useClass: RedirectInterceptor, multi: true },
//         { provide: CLIENT_INCOMING_DECODE_INTERCEPTORS, useClass: ErrorResponseInterceptor, multi: true },
//         { provide: CLIENT_INCOMING_DECODE_INTERCEPTORS, useClass: EmptyResponseInterceptor, multi: true },
//         { provide: CLIENT_INCOMING_DECODE_INTERCEPTORS, useClass: CompressResponseInterceptor, multi: true },
//         { provide: CLIENT_INCOMING_DECODE_INTERCEPTORS, useClass: ResponseDeserializeInterceptor, multi: true },
//         // ClientEndpointCodingsHanlders
//     ]
// })
// export class ClientCodingsModule {

// }