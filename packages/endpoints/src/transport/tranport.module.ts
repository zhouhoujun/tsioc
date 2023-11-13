import { Module } from '@tsdi/ioc';
import { TypedRespond } from '@tsdi/core';
import { TransportTypedRespond } from './typed.respond';
import { DefaultRequestHandler } from './handler';
import { RequestHandler } from '../RequestHandler';
import { OutgoingEncoder, InterceptingOutgoingEncoder, InterceptingIncomingDecoder, IncomingDecoder, OutgoingBackend, OUTGOING_ENCODER_INTERCEPTORS, IncomingBackend, INCOMING_DECODER_INTERCEPTORS } from './codings';
import { BufferifyOutgoingEncodeBackend, OutgoingBufferFinalizeEncodeInterceptor, OutgoingPipeEncodeInterceptor, OutgoingSubpacketBufferEncodeInterceptor } from './encoders';
import { PayloadStreamIncomingDecorder, StreamIncomingDecorder, TransportIncomingBackend } from './decoders';


@Module({
    providers: [
        OutgoingPipeEncodeInterceptor,
        { provide: OUTGOING_ENCODER_INTERCEPTORS, useExisting: OutgoingPipeEncodeInterceptor, multi: true, multiOrder: 0 },
        OutgoingBufferFinalizeEncodeInterceptor,
        { provide: OUTGOING_ENCODER_INTERCEPTORS, useExisting: OutgoingBufferFinalizeEncodeInterceptor, multi: true },
        OutgoingSubpacketBufferEncodeInterceptor,
        { provide: OUTGOING_ENCODER_INTERCEPTORS, useExisting: OutgoingSubpacketBufferEncodeInterceptor, multi: true },
        

        BufferifyOutgoingEncodeBackend,
        { provide: OutgoingBackend, useExisting: BufferifyOutgoingEncodeBackend },
        InterceptingOutgoingEncoder,
        { provide: OutgoingEncoder, useExisting: InterceptingOutgoingEncoder },


        StreamIncomingDecorder,
        { provide: INCOMING_DECODER_INTERCEPTORS, useExisting: StreamIncomingDecorder, multi: true, multiOrder: 0 },
        PayloadStreamIncomingDecorder,
        { provide: INCOMING_DECODER_INTERCEPTORS, useExisting: PayloadStreamIncomingDecorder, multi: true },


        TransportIncomingBackend,
        { provide: IncomingBackend, useExisting: TransportIncomingBackend },
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
