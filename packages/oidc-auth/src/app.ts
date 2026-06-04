import { Module } from '@tsdi/ioc';
import { useHttpTransport } from '@tsdi/http';
import { provideService, useCookie, useRouter } from '@tsdi/service';
import { OIDCModule } from './auth/OIDCModule';
import { AuthController } from './controllers/AuthController';

@Module({
    imports: [
        OIDCModule
    ],
    declarations: [
        AuthController
    ],
    providers: [
        provideService(
            useRouter(),
            useCookie(),
            useHttpTransport({
                listenOpts: {
                    host: process.env.OIDC_HOST || '0.0.0.0',
                    port: parseInt(process.env.OIDC_PORT || '3000', 10)
                },
                static: false,
                asDefault: true,
            })
        )
    ]
})
export class AppModule {}
