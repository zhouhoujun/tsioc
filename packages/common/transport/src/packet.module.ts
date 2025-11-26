import { Module } from '@tsdi/ioc';
import { HeaderAdapter } from '@tsdi/common';
import { PacketIdGenerator, PacketNumberIdGenerator } from './PacketId';
import { DefaultHeaderAdapter } from './headers';
// import { DefaultSerializerFactory } from './Serializer';
// import { DefaultDeserializerFactory } from './Deserializer';
import { TopicClientIncomingFactory, TopicIncomingFactory, UrlClientIncomingFactory, UrlIncomingFactory } from './Incoming';
import { TopicOutgoingFactory, UrlOutgoingFactory } from './Outgoing';

@Module({
    providers: [
        // DefaultSerializerFactory,
        // DefaultDeserializerFactory,
        UrlClientIncomingFactory,
        TopicClientIncomingFactory,
        UrlOutgoingFactory,
        UrlIncomingFactory,
        TopicOutgoingFactory,
        TopicIncomingFactory,
        { provide: PacketIdGenerator, useClass: PacketNumberIdGenerator },
        { provide: HeaderAdapter, useClass: DefaultHeaderAdapter, asDefault: true },
    ]
})
export class TransportPacketModule {

}
