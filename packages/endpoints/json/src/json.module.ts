import { Module, ModuleWithProviders, getToken,  ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { Interceptor, TypedRespond } from '@tsdi/core';
import { Context, Decoder, Encoder, Packet } from '@tsdi/common';
import { CLIENT_TRANSPORT_PACKET_STRATEGIES, ResponseTransform, defaultTransform } from '@tsdi/common/client';
import { RequestHandler, Responder, TRANSPORT_PACKET_STRATEGIES } from '@tsdi/endpoints';
import { JsonEncoder, SimpleJsonEncoderBackend, JsonInterceptingEncoder, JsonEncoderBackend, JSON_ENCODER_INTERCEPTORS, FinalizeJsonEncodeInterceptor } from './encoder';
import { JsonDecoder, SimpleJsonDecoderBackend, JsonInterceptingDecoder, JsonDecoderBackend, JSON_DECODER_INTERCEPTORS } from './decoder';
import { JsonResponder } from './responder';
import { JsonTransportTypedRespond } from './typed.respond';
import { JsonRequestHandler } from './handler';


CLIENT_TRANSPORT_PACKET_STRATEGIES['json'] = {
    encoder: { useExisting: JsonEncoder },
    decoder: { useExisting: JsonDecoder }
}

TRANSPORT_PACKET_STRATEGIES['json'] = {
    encoder: { useExisting: JsonEncoder },
    decoder: { useExisting: JsonDecoder },
    typedRespond: { useExisting: JsonTransportTypedRespond },
    responder: { useExisting: JsonResponder },
    requestHanlder: { useExisting: JsonRequestHandler }
};

@Module({
    providers: [
        FinalizeJsonEncodeInterceptor,
        { provide: JSON_ENCODER_INTERCEPTORS, useExisting: FinalizeJsonEncodeInterceptor, multi: true, multiOrder: 0 },

        { provide: getToken(ResponseTransform, 'json'), useValue: defaultTransform },

        SimpleJsonEncoderBackend,
        JsonInterceptingEncoder,
        { provide: JsonEncoderBackend, useExisting: SimpleJsonEncoderBackend, asDefault: true },


        SimpleJsonDecoderBackend,
        JsonInterceptingDecoder,
        { provide: JsonDecoderBackend, useExisting: SimpleJsonDecoderBackend, asDefault: true },

        { provide: JsonEncoder, useExisting: JsonInterceptingEncoder },
        { provide: JsonDecoder, useExisting: JsonInterceptingDecoder },

        { provide: Encoder, useExisting: JsonEncoder, asDefault: true },
        { provide: Decoder, useExisting: JsonDecoder, asDefault: true },

        JsonTransportTypedRespond,
        { provide: TypedRespond, useExisting: JsonTransportTypedRespond },

        JsonRequestHandler,
        { provide: RequestHandler, useExisting: JsonRequestHandler },

        JsonResponder,
        { provide: Responder, useExisting: JsonResponder }
    ]
})
export class JsonTransportModule {

    static withOptions(options: {
        encoderBacked?: ProvdierOf<JsonEncoderBackend>,
        encoderInterceptors?: ProvdierOf<Interceptor<Context, Buffer>>[],
        decoderBacked?: ProvdierOf<JsonDecoderBackend>,
        decoderInterceptors?: ProvdierOf<Interceptor<Context, Packet>>[],
        providers: ProviderType[]
    }): ModuleWithProviders<JsonTransportModule> {
        const providers: ProviderType[] = options.providers ?? [];
        if (options.decoderBacked) {
            providers.push(toProvider(JsonEncoderBackend, options.decoderBacked))
        }
        if (options.encoderInterceptors) {
            options.encoderInterceptors.forEach(p => {
                providers.push(toProvider(JSON_ENCODER_INTERCEPTORS, p, true))
            })
        }
        if (options.encoderBacked) {
            providers.push(toProvider(JsonDecoderBackend, options.encoderBacked))
        }
        if (options.encoderInterceptors) {
            options.encoderInterceptors.forEach(p => {
                providers.push(toProvider(JSON_DECODER_INTERCEPTORS, p, true))
            })
        }


        return {
            module: JsonTransportModule,
            providers
        }
    }

}
