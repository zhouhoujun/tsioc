import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { AuthorizationAspect } from './aspect';

@Module({
    providers: [
        AuthorizationAspect
    ]
})
export class SecurityModule {

}


export function provideSecurityModule(options: {
    type: 'basic' | 'oauth' | 'oauth2' | 'oidc'
}): ModuleWithProviders {
    return {
        module: SecurityModule,
        providers: [

        ]
    }
}