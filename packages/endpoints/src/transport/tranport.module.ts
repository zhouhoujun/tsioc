import { Module } from '@tsdi/ioc';
import { TypedRespond } from '@tsdi/core';
import { TransportTypedRespond } from './typed.respond';
import { DefaultRequestHandler } from './handler';
import { RequestHandler } from '../RequestHandler';
import { OutgoingEncoder, InterceptingOutgoingEncoder, InterceptingIncomingDecoder, IncomingDecoder, OutgoingBackend, OUTGOING_ENCODER_INTERCEPTORS } from './codings';
import { BufferOutgoingEncodeBackend, OutgoingBufferFinalizeEncodeInterceptor, OutgoingPipeEncodeInterceptor, OutgoingSubpacketBufferEncodeInterceptor } from './encoders';


@Module({
    providers: [
        OutgoingPipeEncodeInterceptor,
        { provide: OUTGOING_ENCODER_INTERCEPTORS, useExisting: OutgoingPipeEncodeInterceptor, multi: true, multiOrder: 0 },
        OutgoingBufferFinalizeEncodeInterceptor,
        { provide: OUTGOING_ENCODER_INTERCEPTORS, useExisting: OutgoingBufferFinalizeEncodeInterceptor, multi: true },
        OutgoingSubpacketBufferEncodeInterceptor,
        { provide: OUTGOING_ENCODER_INTERCEPTORS, useExisting: OutgoingSubpacketBufferEncodeInterceptor, multi: true },
        

        BufferOutgoingEncodeBackend,
        { provide: OutgoingBackend, useExisting: BufferOutgoingEncodeBackend },
        InterceptingOutgoingEncoder,
        { provide: OutgoingEncoder, useExisting: InterceptingOutgoingEncoder },



        InterceptingIncomingDecoder,
        { provide: IncomingDecoder, useExisting: InterceptingIncomingDecoder },

        // FinalizeEncodeInterceptor,
        // { provide: ENCODER_INTERCEPTORS, useExisting: FinalizeEncodeInterceptor, multi: true, multiOrder: 0 },

        // TransportEncoderBackend,
        // InterceptingEncoder,
        // { provide: EncoderBackend, useExisting: TransportEncoderBackend, asDefault: true },


        // TransportDecoderBackend,
        // InterceptingDecoder,
        // { provide: DecoderBackend, useExisting: TransportDecoderBackend, asDefault: true },

        // { provide: Encoder, useExisting: InterceptingEncoder, asDefault: true },
        // { provide: Decoder, useExisting: InterceptingDecoder, asDefault: true },


        TransportTypedRespond,
        { provide: TypedRespond, useExisting: TransportTypedRespond, asDefault: true },

        DefaultRequestHandler,
        { provide: RequestHandler, useExisting: DefaultRequestHandler, asDefault: true }

    ]
})
export class TransportModule {

}
