import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { AuthorizationAspect } from './aspect';

export const SECURITY_PROVIDERS: Provider[] = [
    AuthorizationAspect
];

@Module({
    providers: SECURITY_PROVIDERS
})
export class SecurityModule {
    static withOptions(options: {
        type: 'basic' | 'oauth' | 'oauth2' | 'oidc'
    }): ModuleWithProviders<SecurityModule> {
        return {
            module: SecurityModule,
            providers: createSecurityProviders(options)
        };
    }
}

function createSecurityProviders(options: {
    type: 'basic' | 'oauth' | 'oauth2' | 'oidc'
}): Provider[] {
    void options;
    return [];
}

export function provideSecurity(options: {
    type: 'basic' | 'oauth' | 'oauth2' | 'oidc'
}): Provider[] {
    return [
        ...SECURITY_PROVIDERS,
        ...createSecurityProviders(options)
    ];
}
