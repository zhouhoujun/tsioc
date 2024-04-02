import { Module } from '@tsdi/ioc';
import { RequestEncodingsModule } from './request.encodings';
import { ResponseDecodingsModule } from './response.decodings';
import { TransportCodingsBackend } from './transport.backend';
import { TransportBackend } from '../backend';

@Module({
    imports: [
        RequestEncodingsModule,
        ResponseDecodingsModule
    ],
    providers: [
        { provide: TransportBackend, useClass: TransportCodingsBackend },
    ],
    exports:[
        RequestEncodingsModule,
        ResponseDecodingsModule
    ]
})
export class ClientCodingsModule {

}