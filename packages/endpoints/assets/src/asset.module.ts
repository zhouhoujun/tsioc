import { Module, ProviderType, ModuleWithProviders, ProvdierOf, toProvider, getToken } from '@tsdi/ioc';
import { Interceptor, TypedRespond } from '@tsdi/core';
import { Context, Decoder, Encoder, Packet } from '@tsdi/common';
import { CLIENT_TRANSPORT_PACKET_STRATEGIES, GLOBAL_CLIENT_INTERCEPTORS, ResponseTransform } from '@tsdi/common/client';
import { AssetContextFactory, RequestHandler, Responder, StatusVaildator, TRANSPORT_PACKET_STRATEGIES } from '@tsdi/endpoints';
import { ASSET_ENDPOINT_PROVIDERS } from './asset.pdr';
import { AssetResponder } from './responder';
import { ASSET_ENCODER_INTERCEPTORS, AssetEncoder, AssetEncoderBackend, AssetInterceptingEncoder, BufferifyEncodeInterceptor, FinalizeAssetEncodeInterceptor, SimpleAssetEncoderBackend, SubpacketBufferEncodeInterceptor } from './encoder';
import { ASSET_DECODER_INTERCEPTORS, AssetDecoder, AssetDecoderBackend, AssetInterceptingDecoder, SimpleAssetDecoderBackend } from './decoder';
import { HttpStatusVaildator } from './impl/status';
import { AssetTransportTypedRespond } from './impl/typed.respond';
import { AssetRequestHandler } from './handler';
import { InterceptorsModule } from './interceptors.module';
import { AssetResponseTransform } from './impl/resp.transform';
import { AssetContextFactoryImpl } from './impl/context';
import { BodyContentInterceptor } from './interceptors/body';


CLIENT_TRANSPORT_PACKET_STRATEGIES['asset'] = {
    encoder: { useExisting: AssetEncoder },
    decoder: { useExisting: AssetDecoder }
};

TRANSPORT_PACKET_STRATEGIES['asset'] = {
    encoder: { useExisting: AssetEncoder },
    decoder: { useExisting: AssetDecoder },
    typedRespond: { useExisting: AssetTransportTypedRespond },
    responder: { useExisting: AssetResponder },
    requestHanlder: { useExisting: AssetRequestHandler }
};

@Module({
    providers: [
        ...ASSET_ENDPOINT_PROVIDERS,
        HttpStatusVaildator
    ]
})
export class AssetModule {

}


@Module({
    imports:[
        AssetModule
    ],
    providers: [
        AssetTransportTypedRespond,
        { provide: TypedRespond, useExisting: AssetTransportTypedRespond },

        BodyContentInterceptor,
        { provide: GLOBAL_CLIENT_INTERCEPTORS, useExisting: BodyContentInterceptor, multi: true },
        AssetResponseTransform,
        { provide: getToken(ResponseTransform, 'asset'), useExisting: AssetResponseTransform },
        SimpleAssetEncoderBackend,
        AssetInterceptingEncoder,
        { provide: AssetEncoderBackend, useExisting: SimpleAssetEncoderBackend, asDefault: true },
        FinalizeAssetEncodeInterceptor,
        BufferifyEncodeInterceptor,
        SubpacketBufferEncodeInterceptor,
        { provide: ASSET_ENCODER_INTERCEPTORS, useExisting: FinalizeAssetEncodeInterceptor, multi: true, multiOrder: 0 },
        { provide: ASSET_ENCODER_INTERCEPTORS, useExisting: BufferifyEncodeInterceptor, multi: true, multiOrder: 0 },
        { provide: ASSET_ENCODER_INTERCEPTORS, useExisting: SubpacketBufferEncodeInterceptor, multi: true },

        SimpleAssetDecoderBackend,
        AssetInterceptingDecoder,
        { provide: AssetDecoderBackend, useExisting: SimpleAssetDecoderBackend, asDefault: true },

        { provide: AssetEncoder, useExisting: AssetInterceptingEncoder },
        { provide: AssetDecoder, useExisting: AssetInterceptingDecoder },

        { provide: Encoder, useExisting: AssetEncoder, asDefault: true },
        { provide: Decoder, useExisting: AssetDecoder, asDefault: true },

        AssetTransportTypedRespond,
        { provide: TypedRespond, useExisting: AssetTransportTypedRespond, asDefault: true },

        AssetContextFactoryImpl,
        { provide: AssetContextFactory, useExisting: AssetContextFactoryImpl, asDefault: true },

        AssetRequestHandler,
        { provide: RequestHandler, useExisting: AssetRequestHandler, asDefault: true },

        { provide: StatusVaildator, useExisting: HttpStatusVaildator, asDefault: true },

        AssetResponder,
        { provide: Responder, useExisting: AssetResponder, asDefault: true }
    ],
    exports: [
        AssetModule,
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
        if (options.decoderBacked) {
            providers.push(toProvider(AssetEncoderBackend, options.decoderBacked))
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

