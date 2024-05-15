import { Module } from '@tsdi/ioc';
import { DecodingsFactory } from './decodings';
import { EncodingsFactory } from './encodings';
import { CodingMappings } from './mappings';
import { Codings } from './Codings';
import { PacketIdGenerator, PacketNumberIdGenerator } from './PacketId';


/**
 * Codings Module.
 */
@Module({
    providers: [
        CodingMappings,
        Codings,
        EncodingsFactory,
        DecodingsFactory,
        { provide: PacketIdGenerator, useClass: PacketNumberIdGenerator, asDefault: true }
    ]
})
export class CodingsModule {

}
