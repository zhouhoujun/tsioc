import { Module } from '@tsdi/ioc';
import { JsonEncodingsModule } from './json.encodings';
import { JsonDecodingsModule } from './json.decodings';

@Module({
    imports: [
        JsonEncodingsModule,
        JsonDecodingsModule
    ],
    providers: [
        
    ]
})
export class JsonCodingsModule {

}