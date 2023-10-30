import { Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { Interceptor, TypedRespond } from '@tsdi/core';
import { Context, Packet, TransportFactory } from '@tsdi/common';
import { RequestHandler, Responder } from '@tsdi/endpoints';
import { JsonEncoder, SimpleJsonEncoderBackend, JsonInterceptingEncoder, JsonEncoderBackend, JSON_ENCODER_INTERCEPTORS } from './encoder';
import { JsonDecoder, SimpleJsonDecoderBackend, JsonInterceptingDecoder, JsonDecoderBackend, JSON_DECODER_INTERCEPTORS } from './decoder';
import { JsonSender } from './sender';
import { JsonReceiver } from './receiver';
import { JsonTransportFactory } from './factory';
import { JsonResponder } from './responder';
import { JsonTransportTypedRespond } from './typed.respond';
import { JsonRequestHandler } from './handler';


@Module({
    providers: [
        SimpleJsonEncoderBackend,
        JsonInterceptingEncoder,
        { provide: JsonEncoderBackend, useExisting: SimpleJsonEncoderBackend, asDefault: true },

        SimpleJsonDecoderBackend,
        JsonInterceptingDecoder,
        { provide: JsonDecoderBackend, useExisting: SimpleJsonDecoderBackend, asDefault: true },

        { provide: JsonEncoder, useExisting: JsonInterceptingEncoder },
        { provide: JsonDecoder, useExisting: JsonInterceptingDecoder },

        JsonTransportTypedRespond,
        { provide: TypedRespond, useExisting: JsonTransportTypedRespond },

        JsonRequestHandler,
        { provide: RequestHandler, useExisting: JsonRequestHandler },
        

        JsonReceiver,
        JsonSender,
        JsonResponder,
        JsonTransportFactory,
        { provide: TransportFactory, useExisting: JsonTransportFactory },
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
