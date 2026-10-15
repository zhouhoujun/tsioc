import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SshClient } from '../src/ssh-client';

class ExposedSshClient extends SshClient {
    verifier(): (key: Buffer, verify: (valid: boolean) => void) => void {
        return (this as any).createHostVerifier();
    }
}

@Suite('ssh strict known_hosts verification')
export class SshKnownHostsTest {

    @Test('strict mode accepts the host key recorded in known_hosts and rejects others')
    async strictVerifiesAgainstKnownHosts() {
        const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tsioc-ssh-'));
        fs.mkdirSync(path.join(home, '.ssh'), { recursive: true });
        const key = Buffer.from('0123456789abcdef0123456789abcdef01234567', 'utf8');
        const keyBase64 = key.toString('base64');
        // A standard known_hosts line: '<host> <key-type> <base64-key>'.
        fs.writeFileSync(path.join(home, '.ssh', 'known_hosts'), `example.com ssh-ed25519 ${keyBase64}\n`);

        const originalHome = process.env.HOME;
        process.env.HOME = home;
        try {
            const client = new ExposedSshClient({ host: 'example.com', username: 'root', knownHosts: 'strict' });
            const verifyKey = client.verifier();

            let accepted: boolean | undefined;
            verifyKey(key, valid => { accepted = valid; });
            expect(accepted).toEqual(true);

            let rejected: boolean | undefined;
            verifyKey(Buffer.from('ffffffffffffffffffffffffffffffffffffffff', 'utf8'), valid => { rejected = valid; });
            expect(rejected).toEqual(false);
        } finally {
            process.env.HOME = originalHome;
            fs.rmSync(home, { recursive: true, force: true });
        }
    }
}
