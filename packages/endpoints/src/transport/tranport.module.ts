import { Module, ModuleWithProviders, getToken, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { TypedRespond } from '@tsdi/core';
import { DecodeInterceptor, Decoder, DecoderBackend, EncodeInterceptor, Encoder, EncoderBackend } from '@tsdi/common';
import { ResponseTransform, defaultTransform } from '@tsdi/common/client';
import { TransportEncoderBackend, InterceptingEncoder, ENCODER_INTERCEPTORS, FinalizeEncodeInterceptor } from './encoder';
import { TransportDecoderBackend, InterceptingDecoder, DECODER_INTERCEPTORS } from './decoder';
import { TransportTypedRespond } from './typed.respond';
import { DefaultRequestHandler } from './handler';
import { RequestHandler } from '../RequestHandler';


@Module({
    providers: [
        FinalizeEncodeInterceptor,
        { provide: ENCODER_INTERCEPTORS, useExisting: FinalizeEncodeInterceptor, multi: true, multiOrder: 0 },

        { provide: getToken(ResponseTransform, 'json'), useValue: defaultTransform },

        TransportEncoderBackend,
        InterceptingEncoder,
        { provide: EncoderBackend, useExisting: TransportEncoderBackend, asDefault: true },


        TransportDecoderBackend,
        InterceptingDecoder,
        { provide: DecoderBackend, useExisting: TransportDecoderBackend, asDefault: true },

        { provide: Encoder, useExisting: InterceptingEncoder, asDefault: true },
        { provide: Decoder, useExisting: InterceptingDecoder, asDefault: true },


        TransportTypedRespond,
        { provide: TypedRespond, useExisting: TransportTypedRespond, asDefault: true },

        DefaultRequestHandler,
        { provide: RequestHandler, useExisting: DefaultRequestHandler, asDefault: true }

    ]
})
export class TransportModule {

    static withOptions(options: {
        encoderBacked?: ProvdierOf<EncoderBackend>,
        encoderInterceptors?: ProvdierOf<EncodeInterceptor>[],
        decoderBacked?: ProvdierOf<DecoderBackend>,
        decoderInterceptors?: ProvdierOf<DecodeInterceptor>[],
        providers: ProviderType[]
    }): ModuleWithProviders<TransportModule> {
        const providers: ProviderType[] = options.providers ?? [];
        if (options.decoderBacked) {
            providers.push(toProvider(EncoderBackend, options.decoderBacked))
        }
        if (options.encoderInterceptors) {
            options.encoderInterceptors.forEach(p => {
                providers.push(toProvider(ENCODER_INTERCEPTORS, p, true))
            })
        }
        if (options.encoderBacked) {
            providers.push(toProvider(DecoderBackend, options.encoderBacked))
        }
        if (options.encoderInterceptors) {
            options.encoderInterceptors.forEach(p => {
                providers.push(toProvider(DECODER_INTERCEPTORS, p, true))
            })
        }


        return {
            module: TransportModule,
            providers
        }
    }

}
