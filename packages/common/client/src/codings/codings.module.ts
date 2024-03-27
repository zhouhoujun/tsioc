import { Module } from '@tsdi/ioc';
import { RequestEncodingsModule } from './encodings';
import { ResponseDecodingsModule } from './decodings';
import { TransportCodingsBackend } from './codings.backend';
import { TransportBackend } from '../backend';

@Module({
    imports: [
        RequestEncodingsModule,
        ResponseDecodingsModule
    ],
    providers: [
        { provide: TransportBackend, useClass: TransportCodingsBackend },
    ]
})
export class ClientCodingsModule {

}