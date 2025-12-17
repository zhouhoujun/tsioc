import { Module } from '@tsdi/ioc';
import { TcpClient } from './client/client';
import { TcpServer, withTcpTransport } from './server/server';
import { provideService, withBodyparser, withContent, withInterceptors, withLogger, withRouter, withTransfers } from '@tsdi/endpoints';
import { useSimpleJson } from '@tsdi/common';
import { TCP_SERV_CONFIG, TcpServConfig } from './server/options';
// import { TcpConfiguration } from './configuration';



@Module({
    // providers: [
    //     provideService(
    //         withInterceptors(),
    //         withBodyparser(),
    //         withContent(),
    //         withRouter(),
    //         withLogger(),
    //         withTransfers(
    //             useSimpleJson()
    //         ),
    //         withTcpTransport({
    //             microservice: true,
    //             listenOpts: {
    //                 port: 3000
    //             }
    //         })
    //     ),
    // ]
})
export class TcpModule {

    static withOptions(options: TcpServConfig) {
        return {
            module: TcpModule,
            providers: [
                { provide: TCP_SERV_CONFIG, useValue: options }
            ]
        }
    }
}
