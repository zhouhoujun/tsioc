import { Module } from '@tsdi/ioc';
import { RequestEncodingsModule } from './encodings';
import { ResponseDecodingsModule } from './decodings';
import { TransportCodingsBackend } from './codings.backend';

@Module({
    imports: [
        RequestEncodingsModule,
        ResponseDecodingsModule
    ],
    providers: [
        TransportCodingsBackend
    ]
})
export class CodingsModule {

}