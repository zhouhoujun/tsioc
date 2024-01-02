import { Module } from '@tsdi/ioc';
import { TypedRespond } from '@tsdi/core';
import { TransportTypedRespond } from './typed.respond';
import {
    OutgoingEncoder, InterceptingOutgoingEncoder, InterceptingIncomingDecoder, IncomingDecoder, OutgoingBackend,
    OUTGOING_ENCODER_INTERCEPTORS, IncomingBackend, INCOMING_DECODER_INTERCEPTORS
} from './codings';
import {
    TransportOutgoingEncodeBackend, OutgoingBufferFinalizeEncodeInterceptor, OutgoingPipeEncodeInterceptor, OutgoingSubpacketBufferEncodeInterceptor,
    JsonOutgoingEncodeInterceptor, PayloadOutgoingEncodeInterceptor, EmptyOutgoingEncodeInterceptor, HeadOutgoingEncodeInterceptor, NoBodyOutgoingEncodeInterceptor
} from './encoders';
import {
    BufferIncomingDecordeBackend, BufferIncomingDecordeInterceptor, IncomingMessageDecordeInterceptor,
    StreamIncomingDecordeInterceptor, StringIncomingDecordeInterceptor, TransportIncomingDecordeBackend
} from './decoders';


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

        StringIncomingDecordeInterceptor,
        BufferIncomingDecordeInterceptor,
        StreamIncomingDecordeInterceptor,
        IncomingMessageDecordeInterceptor,
        // { provide: INCOMING_PACKET_DECODER_INTERCEPTORS, useExisting: StreamIncomingDecordeInterceptor, multi: true },
        // { provide: INCOMING_PACKET_DECODER_INTERCEPTORS, useExisting: BufferIncomingDecordeInterceptor, multi: true },
        // { provide: INCOMING_PACKET_DECODER_INTERCEPTORS, useExisting: StringIncomingDecordeInterceptor, multi: true },
        // { provide: INCOMING_PACKET_DECODER_INTERCEPTORS, useExisting: IncomingMessageDecordeInterceptor, multi: true },

        BufferIncomingDecordeBackend,
        // { provide: IncomingDecodeBackend, useExisting: BufferIncomingDecordeBackend },
        // InterceptingIncomingDecoder,
        // { provide: IncomingDecoder, useExisting: InterceptingIncomingDecoder },


        TransportIncomingDecordeBackend,
        { provide: IncomingBackend, useExisting: TransportIncomingDecordeBackend },
        InterceptingIncomingDecoder,
        { provide: IncomingDecoder, useExisting: InterceptingIncomingDecoder },

        TransportTypedRespond,
        { provide: TypedRespond, useExisting: TransportTypedRespond, asDefault: true }

    ]
})
export class TransportModule {

}
