import { Module } from '@tsdi/ioc';
import { HeaderAdapter, Packet } from '@tsdi/common';
// import { CodingsModule, getDecodeInterceptorsToken, getEncodeInterceptorsToken } from '@tsdi/common/codings';
import { PacketIdGenerator, PacketNumberIdGenerator } from './PacketId';
// import { TransportDecodingsFactory, TransportEncodingsFactory } from './condings';
import { PackageDecodeInterceptor, PackageEncodeInterceptor } from './interceptors/buffer.package';
import { BindPacketIdEncodeInterceptor, PacketDecodeInterceptor, PacketEncodeInterceptor } from './interceptors/buffer.packet';
// import { PacketCodingsHandlers } from './packet.codings';
import { DefaultHeaderAdapter } from './headers';
// import { TransportContext } from './context';
import { IncomingMessage } from './Incoming';
import { OutgoingMessage } from './Outgoing';
// import { getDeserializeInterceptorsToken, getSerializeInterceptorsToken } from './serialization/metadata';
import { DefaultSerializerFactory } from './Serializer';
import { DefaultDeserializerFactory } from './Deserializer';
// import { DeserializeContext } from './serialization/Deserializer';
// import { SerializeContext } from './serialization/Serializer';
// import { SerializationModule } from './serialization/serialization.module';


// const PACKET_DECODE_INTERCEPTORS = getDeserializeInterceptorsToken<Packet, IncomingMessage, DeserializeContext>(Packet);
// const PACKET_ENCODE_INTERCEPTORS = getSerializeInterceptorsToken<OutgoingMessage, Packet, SerializeContext>(Packet);

@Module({
    providers: [
        DefaultSerializerFactory,
        DefaultDeserializerFactory,
        { provide: PacketIdGenerator, useClass: PacketNumberIdGenerator },
        { provide: HeaderAdapter, useClass: DefaultHeaderAdapter, asDefault: true },
        // { provide: PACKET_DECODE_INTERCEPTORS, useClass: PacketDecodeInterceptor, multi: true },

        // { provide: PACKET_ENCODE_INTERCEPTORS, useClass: BindPacketIdEncodeInterceptor, multi: true },
        // { provide: PACKET_ENCODE_INTERCEPTORS, useClass: PacketEncodeInterceptor, multi: true }
    ]
})
export class TransportPacketModule {

}


// @Module({
//     providers: [
//         { provide: PACKET_DECODE_INTERCEPTORS, useClass: PackageDecodeInterceptor, multi: true },
//         { provide: PACKET_ENCODE_INTERCEPTORS, useClass: PackageEncodeInterceptor, multi: true },
//     ]
// })
// export class PackageBufferCodingsModule {

// }

