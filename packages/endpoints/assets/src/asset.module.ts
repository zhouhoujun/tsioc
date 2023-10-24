import { Module, ProviderType, ModuleWithProviders, ProvdierOf, toProvider } from '@tsdi/ioc';
import { Interceptor, TypedRespond } from '@tsdi/core';
import { Context, Packet, TransportFactory } from '@tsdi/common';
import { BodyContentInterceptor, GLOBAL_CLIENT_INTERCEPTORS, ResponseTransform } from '@tsdi/common/client';
import { RequestHandler, Responder, StatusVaildator } from '@tsdi/endpoints';
import { ASSET_ENDPOINT_PROVIDERS } from './asset.pdr';
import { AssetResponder } from './responder';
import { ASSET_ENCODER_INTERCEPTORS, AssetEncoder, AssetEncoderBackend, AssetInterceptingEncoder, BufferifyEncodeInterceptor, SimpleAssetEncoderBackend, SubpacketBufferEncodeInterceptor } from './encoder';
import { ASSET_DECODER_INTERCEPTORS, AssetDecoder, AssetDecoderBackend, AssetInterceptingDecoder, SimpleAssetDecoderBackend } from './decoder';
import { AssetReceiver } from './receiver';
import { AssetSender } from './sender';
import { AssetTransportFactory } from './factory';
import { HttpStatusVaildator } from './impl/status';
import { AssetTransportTypedRespond } from './impl/typed.respond';
import { AssetRequestHandler } from './handler';
import { InterceptorsModule } from './interceptors.module';
import { AssetResponseTransform } from './impl/resp.transform';





@Module({
    providers: [
        ...ASSET_ENDPOINT_PROVIDERS,
        { provide: GLOBAL_CLIENT_INTERCEPTORS, useExisting: BodyContentInterceptor, multi: true },
        { provide: ResponseTransform, useClass: AssetResponseTransform },
        SimpleAssetEncoderBackend,
        AssetInterceptingEncoder,
        { provide: AssetEncoderBackend, useExisting: SimpleAssetEncoderBackend, asDefault: true },
        BufferifyEncodeInterceptor,
        SubpacketBufferEncodeInterceptor,
        { provide: ASSET_ENCODER_INTERCEPTORS, useExisting: BufferifyEncodeInterceptor, multi: true, multiOrder: 0 },
        { provide: ASSET_ENCODER_INTERCEPTORS, useExisting: SubpacketBufferEncodeInterceptor, multi: true },

        SimpleAssetDecoderBackend,
        AssetInterceptingDecoder,
        { provide: AssetDecoderBackend, useExisting: SimpleAssetDecoderBackend, asDefault: true },

        { provide: AssetEncoder, useExisting: AssetInterceptingEncoder },
        { provide: AssetDecoder, useExisting: AssetInterceptingDecoder },

        AssetTransportTypedRespond,
        { provide: TypedRespond, useExisting: AssetTransportTypedRespond },

        AssetRequestHandler,
        { provide: RequestHandler, useExisting: AssetRequestHandler },

        HttpStatusVaildator,
        { provide: StatusVaildator, useExisting: HttpStatusVaildator },

        AssetReceiver,
        AssetSender,
        AssetResponder,
        AssetTransportFactory,
        { provide: TransportFactory, useExisting: AssetTransportFactory },
        { provide: Responder, useExisting: AssetResponder }
    ],
    exports: [
        InterceptorsModule
    ]
})
export class AssetTransportModule {

    /**
     * import tcp micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOptions(options: {
        encoderBacked?: ProvdierOf<AssetEncoderBackend>,
        encoderInterceptors?: ProvdierOf<Interceptor<Context, Buffer>>[],
        decoderBacked?: ProvdierOf<AssetDecoderBackend>,
        decoderInterceptors?: ProvdierOf<Interceptor<Context, Packet>>[],
        providers: ProviderType[]
    }): ModuleWithProviders<AssetTransportModule> {
        const providers: ProviderType[] = options.providers ?? [];
        if (options.encoderBacked) {
            providers.push(toProvider(AssetEncoderBackend, options.encoderBacked))
        }
        if (options.encoderInterceptors) {
            options.encoderInterceptors.forEach(p => {
                providers.push(toProvider(ASSET_ENCODER_INTERCEPTORS, p, true))
            })
        }
        if (options.encoderBacked) {
            providers.push(toProvider(AssetDecoderBackend, options.encoderBacked))
        }
        if (options.encoderInterceptors) {
            options.encoderInterceptors.forEach(p => {
                providers.push(toProvider(ASSET_DECODER_INTERCEPTORS, p, true))
            })
        }

        return {
            module: AssetTransportModule,
            providers
        }
    }

}

