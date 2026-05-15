import { Module } from '@tsdi/ioc';
import { OIDCModule as SharedOIDCModule, OAuth2Module } from '@tsdi/security';
import { OIDCService } from './OIDCService';

@Module({
    imports: [
        OAuth2Module,
        SharedOIDCModule
    ],
    providers: [
        OIDCService
    ],
    exports: [OIDCService]
})
export class OIDCModule {}
