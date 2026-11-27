import expect = require('expect');
import { Transport } from '@tsdi/common';
import { GATEWAY_LOCAL_PATHS } from '@tsdi/gateway';
import { useGatewayAdminUi } from '../src/controller';
import { useGatewayAdminAuth } from '../src/auth';

describe('admin gateway local paths', () => {
    const config = {
        transport: Transport.HTTP,
        side: 0,
        microservice: true,
        features: {}
    } as any;

    function tokenValues(feature: any): string[][] {
        return feature.providers
            .filter((provider: any) => provider.provide === GATEWAY_LOCAL_PATHS)
            .map((provider: any) => provider.useValue);
    }

    it('registers the UI prefix and admin API as local gateway paths', () => {
        const feature = useGatewayAdminUi({ root: '/tmp/admin-ui', prefix: '/admin' })(config) as any;
        expect(feature.providers.some((provider: any) => provider.provide === GATEWAY_LOCAL_PATHS && provider.multi === true)).toBe(true);
        expect(tokenValues(feature)).toContainEqual(['/admin', '/api/gateway-admin']);
    });

    it('registers custom auth API/UI prefixes as local gateway paths', () => {
        const feature = useGatewayAdminAuth({
            mode: 'none',
            apiPrefix: '/internal-admin',
            uiPrefix: '/console'
        })(config) as any;
        const values = tokenValues(feature).flat();
        expect(values).toContain('/internal-admin');
        expect(values).toContain('/console');
    });
});
