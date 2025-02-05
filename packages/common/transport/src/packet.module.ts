import { Module } from '@tsdi/ioc';
import { HeaderAdapter } from '@tsdi/common';
// import { CodingsModule, getDecodeInterceptorsToken, getEncodeInterceptorsToken } from '@tsdi/common/codings';
import { PacketIdGenerator, PacketNumberIdGenerator } from './PacketId';
// import { TransportDecodingsFactory, TransportEncodingsFactory } from './condings';
// import { PackageDecodeInterceptor, PackageEncodeInterceptor } from './interceptors/buffer.package';
// import { BindPacketIdEncodeInterceptor, PacketDecodeInterceptor, PacketEncodeInterceptor } from './interceptors/buffer.packet';
// import { PacketCodingsHandlers } from './packet.codings';
import { DefaultHeaderAdapter } from './headers';
// import { TransportContext } from './context';
// import { IncomingMessage } from './Incoming';
// import { OutgoingMessage } from './Outgoing';
// import { getDeserializeInterceptorsToken, getSerializeInterceptorsToken } from './serialization/metadata';
import { DefaultSerializerFactory } from './Serializer';
import { DefaultDeserializerFactory } from './Deserializer';
import { TopicClientIncomingFactory, TopicIncomingFactory, UrlClientIncomingFactory, UrlIncomingFactory } from './Incoming';
import { TopicOutgoingFactory, UrlOutgoingFactory } from './Outgoing';
// import { DeserializeContext } from './serialization/Deserializer';
// import { SerializeContext } from './serialization/Serializer';
// import { SerializationModule } from './serialization/serialization.module';


// const PACKET_DECODE_INTERCEPTORS = getDeserializeInterceptorsToken<Packet, IncomingMessage, DeserializeContext>(Packet);
// const PACKET_ENCODE_INTERCEPTORS = getSerializeInterceptorsToken<OutgoingMessage, Packet, SerializeContext>(Packet);

@Module({
    providers: [
        DefaultSerializerFactory,
        DefaultDeserializerFactory,
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
