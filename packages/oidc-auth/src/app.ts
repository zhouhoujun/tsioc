import { Module } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { OIDCModule } from './auth/OIDCModule';
import { AuthController } from './controllers/AuthController';
import { User } from './models/User';

@Module({
    imports: [
        TypeormAdapter,
        OIDCModule
    ],
    controllers: [
        AuthController
    ],
    entities: [
        User
    ]
})
export class AppModule {}
