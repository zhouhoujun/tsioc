import { Module } from '@tsdi/ioc';
import { SerializeFactory, DeserializeFactory } from './serialization';
import { SerializeMappings, DeserializeMappings } from './mappings';


/**
 * Codings Module.
 */
@Module({
    providers: [
        SerializeMappings,
        DeserializeMappings,
        SerializeFactory,
        DeserializeFactory,
    ]
})
export class SerializationModule {

}
