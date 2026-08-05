import { Provider } from '@tsdi/ioc';
import { SshConnectionManager } from './ssh-manager';
import { AGENT_SSH_OPTIONS, SshOptions } from './tokens';
import { mergeSshOptions } from './options';

export function provideSsh(options?: SshOptions): Provider[] {
    return [
        { provide: AGENT_SSH_OPTIONS, useValue: mergeSshOptions(options), asDefault: true },
        SshConnectionManager
    ];
}

export function withSsh(options?: SshOptions): Provider[] {
    return provideSsh(options);
}
