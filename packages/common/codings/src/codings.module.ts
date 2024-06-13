import { Module } from '@tsdi/ioc';
import { DecodingsFactory } from './decodings';
import { EncodingsFactory } from './encodings';
import { CodingMappings } from './mappings';


/**
 * Codings Module.
 */
@Module({
    providers: [
        CodingMappings,
        EncodingsFactory,
        DecodingsFactory,
    ]
})
export class CodingsModule {

}
