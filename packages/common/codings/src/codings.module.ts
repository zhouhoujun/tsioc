import { Module } from '@tsdi/ioc';
import { DecodingsFactory } from './decodings';
import { EncodingsFactory } from './encodings';
import { CodingMappings } from './mappings';
// import { Codings } from './Codings';


/**
 * Codings Module.
 */
@Module({
    providers: [
        CodingMappings,
        // Codings,
        EncodingsFactory,
        DecodingsFactory,
    ]
})
export class CodingsModule {

}
