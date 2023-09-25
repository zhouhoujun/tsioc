import { Module, ProviderType, ModuleWithProviders, ProvdierOf, toProvider } from '@tsdi/ioc';
import { Interceptor } from '@tsdi/core';
import { Context, Packet, TransportFactory } from '@tsdi/common';
import { Responder } from '@tsdi/endpoints';
import { ASSET_ENDPOINT_PROVIDERS } from './asset.pdr';
import { AssetResponder } from './responder';
import { ASSET_ENCODER_INTERCEPTORS, AssetEncoder, AssetEncoderBackend, AssetInterceptingEncoder, SimpleAssetEncoderBackend } from './encoder';
import { ASSET_DECODER_INTERCEPTORS, AssetDecoder, AssetDecoderBackend, AssetInterceptingDecoder, SimpleAssetDecoderBackend } from './decoder';
import { AssetReceiver } from './receiver';
import { AssetSender } from './sender';
import { AssetTransportFactory } from './factory';





@Module({
    providers: [
        ...ASSET_ENDPOINT_PROVIDERS,
        SimpleAssetEncoderBackend,
        AssetInterceptingEncoder,
        { provide: AssetEncoderBackend, useExisting: SimpleAssetEncoderBackend, asDefault: true },

        SimpleAssetDecoderBackend,
        AssetInterceptingDecoder,
        { provide: AssetDecoderBackend, useExisting: SimpleAssetDecoderBackend, asDefault: true },

        { provide: AssetEncoder, useExisting: AssetInterceptingEncoder },
        { provide: AssetDecoder, useExisting: AssetInterceptingDecoder },
        AssetReceiver,
        AssetSender,
        AssetResponder,
        AssetTransportFactory,
        { provide: TransportFactory, useExisting: AssetTransportFactory },
        { provide: Responder, useExisting: AssetResponder }
    ]
})
export class AssetEndpointModule {

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
    }): ModuleWithProviders<AssetEndpointModule> {
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
            module: AssetEndpointModule,
            providers
        }
    }

}

