import { Module } from '@tsdi/ioc';
import { RequestEncodingsHandlers } from './request.encodings';
import { CompressResponseDecordeInterceptor, ResponseDecodingsHandlers } from './response.decodings';
import { CodingsTransportBackend } from './transport.backend';
import { TransportBackend } from '../backend';
import { CodingsModule, getDecodingInterceptorsToken } from '@tsdi/common/transport';

@Module({
    imports:[
        CodingsModule
    ],
    providers: [
        { provide: TransportBackend, useClass: CodingsTransportBackend },
        RequestEncodingsHandlers,
        ResponseDecodingsHandlers,
        { provide: getDecodingInterceptorsToken('ResponseIncoming'), useClass: CompressResponseDecordeInterceptor, multi: true }
    ]
})
export class ClientCodingsModule {

}