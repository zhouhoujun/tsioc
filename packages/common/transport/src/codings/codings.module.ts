
import { Module } from '@tsdi/ioc';
import { DecodingsModule } from './decodings';
import { EncodingsModule } from './encodings';

@Module({
    exports: [
        EncodingsModule,
        DecodingsModule
    ]
})
export class CodingsModule {

}
