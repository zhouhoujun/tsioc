import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { TCPClient } from './clinet';
import { TCPServer } from './server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        TCPClient,
        TCPServer
    ]
})
export class TcpModule {

}
