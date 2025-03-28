import { Module, ProviderType } from '@tsdi/ioc';
import { OIDCService } from './OIDCService';
import { OIDCStrategy } from './OIDCStrategy';
import { OIDCInterceptor } from './OIDCInterceptor';

@Module({
    providers: [
        OIDCService,
        OIDCStrategy,
        OIDCInterceptor
    ],
    exports: [OIDCService]
})
export class OIDCModule {}
