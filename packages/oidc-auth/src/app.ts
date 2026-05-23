import { Module } from '@tsdi/ioc';
import { HttpModule, HttpServOptions, HTTP_SERV_OPTIONS } from '@tsdi/http';
import { Transport, TransferSide } from '@tsdi/common';
import { OIDCModule } from './auth/OIDCModule';
import { AuthController } from './controllers/AuthController';

const oidcHttpOptions: HttpServOptions = {
    transport: Transport.HTTP,
    side: TransferSide.server,
    features: {},
    listenOpts: {
        host: process.env.OIDC_HOST || '0.0.0.0',
        port: parseInt(process.env.OIDC_PORT || '3000', 10)
    },
    static: false
};

@Module({
    imports: [
        HttpModule,
        OIDCModule
    ],
    declarations: [
        AuthController
    ],
    providers: [
        { provide: HTTP_SERV_OPTIONS, useValue: oidcHttpOptions }
    ]
})
export class AppModule {}
