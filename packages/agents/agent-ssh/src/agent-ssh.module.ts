import { Module } from '@tsdi/ioc';
import { AgentModule } from '@tsdi/agent';
import { provideSsh } from './provider';
import { SshConnectionManager } from './ssh-manager';

@Module({
    imports: [AgentModule],
    providers: [
        ...provideSsh(),
        SshConnectionManager
    ],
    exports: [
        SshConnectionManager
    ]
})
export class AgentSshModule {}
