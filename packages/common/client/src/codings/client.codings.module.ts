import { Module } from '@tsdi/ioc';
import { CodingsModule, ResponsePacketIncoming, getDecodeInterceptorsToken } from '@tsdi/common/transport';
import { RequestEncodingsHandlers } from './request.encodings';
import { CompressResponseDecordeInterceptor, ResponseDecodingsHandlers } from './response.decodings';
import { CodingsTransportBackend } from './transport.backend';
import { TransportBackend } from '../backend';

@Module({
    imports:[
        CodingsModule
    ],
    providers: [
        { provide: TransportBackend, useClass: CodingsTransportBackend },
        RequestEncodingsHandlers,
        ResponseDecodingsHandlers,
        { provide: getDecodeInterceptorsToken(ResponsePacketIncoming), useClass: CompressResponseDecordeInterceptor, multi: true }
    ]
})
export class ClientCodingsModule {

}