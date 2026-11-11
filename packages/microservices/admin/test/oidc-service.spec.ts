import expect = require('expect');
import { resolveGatewayAdminOidcServiceEntry } from '../src/oidc-service';

describe('gateway admin oidc service launcher', () => {
    it('resolves the separate packages/oidc-auth entry', () => {
        const entry = resolveGatewayAdminOidcServiceEntry({});
        expect(entry).toBeTruthy();
        expect(entry!.replace(/\\/g, '/')).toContain('oidc-auth/main.ts');
    });

    it('honours an explicit entry', () => {
        const entry = resolveGatewayAdminOidcServiceEntry({ entry: __filename });
        expect(entry).toBe(__filename);
    });
});
