import { Module } from '@tsdi/ioc';
import { TypedRespond } from '@tsdi/core';
import { TransportTypedRespond } from './typed.respond';
import { DefaultRequestHandler } from './handler';
import { RequestHandler } from '../RequestHandler';
import { OutgoingEncoder, InterceptingOutgoingEncoder, InterceptingIncomingDecoder, IncomingDecoder } from './codings';


@Module({
    providers: [
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
