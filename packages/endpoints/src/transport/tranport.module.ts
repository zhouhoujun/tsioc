import { Module } from '@tsdi/ioc';
import { TypedRespond } from '@tsdi/core';
import { TransportTypedRespond } from './typed.respond';
import { DefaultRequestHandler } from './handler';
import { RequestHandler } from '../RequestHandler';
import {
    OutgoingEncoder, InterceptingOutgoingEncoder, InterceptingIncomingDecoder, IncomingDecoder, OutgoingBackend,
    OUTGOING_ENCODER_INTERCEPTORS, IncomingBackend, INCOMING_DECODER_INTERCEPTORS
} from './codings';
import {
    TransportOutgoingEncodeBackend, OutgoingBufferFinalizeEncodeInterceptor, OutgoingPipeEncodeInterceptor, OutgoingSubpacketBufferEncodeInterceptor,
    JsonOutgoingEncodeInterceptor, PayloadOutgoingEncodeInterceptor, EmptyOutgoingEncodeInterceptor, HeadOutgoingEncodeInterceptor, NoBodyOutgoingEncodeInterceptor
} from './encoders';
import { BufferIncomingDecordeInterceptor, PayloadStreamIncomingDecordeInterceptor, StreamIncomingDecordeInterceptor, TransportIncomingDecordeBackend } from './decoders';


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


        StreamIncomingDecordeInterceptor,
        { provide: INCOMING_DECODER_INTERCEPTORS, useExisting: StreamIncomingDecordeInterceptor, multi: true, multiOrder: 0 },
        PayloadStreamIncomingDecordeInterceptor,
        { provide: INCOMING_DECODER_INTERCEPTORS, useExisting: PayloadStreamIncomingDecordeInterceptor, multi: true },
        BufferIncomingDecordeInterceptor,
        { provide: INCOMING_DECODER_INTERCEPTORS, useExisting: BufferIncomingDecordeInterceptor, multi: true },



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
