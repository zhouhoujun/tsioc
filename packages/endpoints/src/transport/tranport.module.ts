import { Module } from '@tsdi/ioc';
import { TypedRespond } from '@tsdi/core';
import { TransportTypedRespond } from './typed.respond';
import { DefaultRequestHandler } from './handler';
import { RequestHandler } from '../RequestHandler';
import {
    OutgoingEncoder, InterceptingOutgoingEncoder, InterceptingIncomingDecoder, IncomingDecoder, OutgoingBackend,
    OUTGOING_ENCODER_INTERCEPTORS, IncomingBackend, INCOMING_DECODER_INTERCEPTORS, INCOMING_PACKET_DECODER_INTERCEPTORS, IncomingPacketDecodeBackend, IncomingPacketDecoder, InterceptingIncomingPacketDecoder
} from './codings';
import {
    TransportOutgoingEncodeBackend, OutgoingBufferFinalizeEncodeInterceptor, OutgoingPipeEncodeInterceptor, OutgoingSubpacketBufferEncodeInterceptor,
    JsonOutgoingEncodeInterceptor, PayloadOutgoingEncodeInterceptor, EmptyOutgoingEncodeInterceptor, HeadOutgoingEncodeInterceptor, NoBodyOutgoingEncodeInterceptor
} from './encoders';
import { BufferIncomingPacketDecordeBackend, StreamIncomingPacketDecordeInterceptor, IncomingPacketMessageDecordeInterceptor, TransportIncomingDecordeBackend, StringIncomingPacketDecordeInterceptor, BufferIncomingPacketDecordeInterceptor } from './decoders';


@Module({
    providers: [
        OutgoingBufferFinalizeEncodeInterceptor,
        { provide: OUTGOING_ENCODER_INTERCEPTORS, useExisting: OutgoingBufferFinalizeEncodeInterceptor, multi: true, multiOrder: 0 },
        OutgoingSubpacketBufferEncodeInterceptor,
        { provide: OUTGOING_ENCODER_INTERCEPTORS, useExisting: OutgoingSubpacketBufferEncodeInterceptor, multi: true },

        EmptyOutgoingEncodeInterceptor,
        { provide: OUTGOING_ENCODER_INTERCEPTORS, useExisting: EmptyOutgoingEncodeInterceptor, multi: true },
        HeadOutgoingEncodeInterceptor,
        { provide: OUTGOING_ENCODER_INTERCEPTORS, useExisting: HeadOutgoingEncodeInterceptor, multi: true },
        NoBodyOutgoingEncodeInterceptor,
        { provide: OUTGOING_ENCODER_INTERCEPTORS, useExisting: NoBodyOutgoingEncodeInterceptor, multi: true },
        JsonOutgoingEncodeInterceptor,
        { provide: OUTGOING_ENCODER_INTERCEPTORS, useExisting: JsonOutgoingEncodeInterceptor, multi: true },
        PayloadOutgoingEncodeInterceptor,
        { provide: OUTGOING_ENCODER_INTERCEPTORS, useExisting: PayloadOutgoingEncodeInterceptor, multi: true },
        OutgoingPipeEncodeInterceptor,
        { provide: OUTGOING_ENCODER_INTERCEPTORS, useExisting: OutgoingPipeEncodeInterceptor, multi: true },



        TransportOutgoingEncodeBackend,
        { provide: OutgoingBackend, useExisting: TransportOutgoingEncodeBackend },
        InterceptingOutgoingEncoder,
        { provide: OutgoingEncoder, useExisting: InterceptingOutgoingEncoder },

        StringIncomingPacketDecordeInterceptor,
        { provide: INCOMING_PACKET_DECODER_INTERCEPTORS, useExisting: StringIncomingPacketDecordeInterceptor, multi: true },
        BufferIncomingPacketDecordeInterceptor,
        { provide: INCOMING_PACKET_DECODER_INTERCEPTORS, useExisting: BufferIncomingPacketDecordeInterceptor, multi: true },
        StreamIncomingPacketDecordeInterceptor,
        { provide: INCOMING_PACKET_DECODER_INTERCEPTORS, useExisting: StreamIncomingPacketDecordeInterceptor, multi: true },
        IncomingPacketMessageDecordeInterceptor,
        { provide: INCOMING_PACKET_DECODER_INTERCEPTORS, useExisting: IncomingPacketMessageDecordeInterceptor, multi: true },

        BufferIncomingPacketDecordeBackend,
        { provide: IncomingPacketDecodeBackend, useExisting: BufferIncomingPacketDecordeBackend },
        InterceptingIncomingPacketDecoder,
        { provide: IncomingPacketDecoder, useExisting: InterceptingIncomingPacketDecoder },
        

        TransportIncomingDecordeBackend,
        { provide: IncomingBackend, useExisting: TransportIncomingDecordeBackend },
        InterceptingIncomingDecoder,
        { provide: IncomingDecoder, useExisting: InterceptingIncomingDecoder },

        TransportTypedRespond,
        { provide: TypedRespond, useExisting: TransportTypedRespond, asDefault: true },

        DefaultRequestHandler,
        { provide: RequestHandler, useExisting: DefaultRequestHandler, asDefault: true }

    ]
})
export class TransportModule {

}
