
import { Module } from '@tsdi/ioc';
import { DecodingsBackend, DecodingsFactory, DecodingsHandler, DecodingsInterceptingHandler, DefaultDecodingsFactory } from './decodings';
import { DefaultEncodingsFactory, EncodingsBackend, EncodingsFactory, EncodingsHandler, EncodingsInterceptingHandler } from './encodings';
import { CodingMappings } from './mappings';

@Module({
    providers: [
        CodingMappings,
        
        EncodingsBackend,
        { provide: EncodingsHandler, useClass: EncodingsInterceptingHandler },
        { provide: EncodingsFactory, useClass: DefaultEncodingsFactory },
        
        DecodingsBackend,
        { provide: DecodingsHandler, useClass: DecodingsInterceptingHandler },
        { provide: DecodingsFactory, useClass: DefaultDecodingsFactory }
    ]
})
export class CodingsModule {

}
