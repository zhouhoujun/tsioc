import { Module } from '@tsdi/ioc';
import { CodingsModule, getDecodeInterceptorsToken } from '@tsdi/common/codings';
import { ClientIncomingPacket } from '@tsdi/common/transport';
import {
    CompressResponseDecordeInterceptor, EmptyResponseDecordeInterceptor, ErrorResponseDecordeInterceptor,
    RedirectDecodeInterceptor, ResponseTypeDecodeInterceptor
} from './response.decodings';
import { ClientBackend } from '../backend';
import { ClientTransportBackend } from './transport.backend';
import { ClientEndpointCodingsHanlders } from './codings.handlers';


const CLIENT_INCOMING_DECODE_INTERCEPTORS = getDecodeInterceptorsToken(ClientIncomingPacket);

@Module({
    imports: [
        CodingsModule
    ],
    providers: [
        { provide: ClientBackend, useClass: ClientTransportBackend, asDefault: true },
        { provide: CLIENT_INCOMING_DECODE_INTERCEPTORS, useClass: ErrorResponseDecordeInterceptor, multi: true },
        { provide: CLIENT_INCOMING_DECODE_INTERCEPTORS, useClass: EmptyResponseDecordeInterceptor, multi: true },
        { provide: CLIENT_INCOMING_DECODE_INTERCEPTORS, useClass: RedirectDecodeInterceptor, multi: true },
        { provide: CLIENT_INCOMING_DECODE_INTERCEPTORS, useClass: CompressResponseDecordeInterceptor, multi: true },
        { provide: CLIENT_INCOMING_DECODE_INTERCEPTORS, useClass: ResponseTypeDecodeInterceptor, multi: true },
        ClientEndpointCodingsHanlders
    ]
})
export class ClientCodingsModule {

}