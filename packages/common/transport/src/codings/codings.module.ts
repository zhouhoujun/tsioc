
import { Module } from '@tsdi/ioc';
import { DecodingsFactory } from './decodings';
import { EncodingsFactory } from './encodings';
import { CodingMappings } from './mappings';
import { Codings } from './Codings';
import { JsonCodingsHandlers } from './json/codings';
import { PacketIdGenerator, PacketNumberIdGenerator } from './PacketId';

@Module({
    providers: [
        CodingMappings,
        Codings,
        EncodingsFactory,
        DecodingsFactory,
        JsonCodingsHandlers,
        { provide: PacketIdGenerator, useClass: PacketNumberIdGenerator, asDefault: true }
    ]
})
export class CodingsModule {

}
