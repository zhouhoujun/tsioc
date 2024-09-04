import { Module } from '@tsdi/ioc';
import { DeserializePipe } from './deserializer';
import { SerializePipe } from './serializer';



@Module({
    providers:[
        SerializePipe,
        DeserializePipe
    ]
})
export class SerialzableModule {

}