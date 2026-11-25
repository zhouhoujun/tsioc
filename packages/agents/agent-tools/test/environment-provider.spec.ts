import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { environmentFromIoPort } from '../src/environment-provider';

@Suite('environment provider')
export class EnvironmentProviderTest {
    @Test('local io ports keep the default local environment')
    envLocal() {
        expect(environmentFromIoPort({ remote: false, runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0 }) } as any)).toBeUndefined();
        expect(environmentFromIoPort(null)).toBeUndefined();
    }

    @Test('remote io ports become a remote environment')
    envRemote() {
        const env = environmentFromIoPort({ remote: true, runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0 }) } as any);
        expect(env?.kind).toEqual('remote');
    }
}
