import { DIModule, Startup, Message, MessageQueue, IBootContext, StartupService, Configure } from '../src';
import { Injectable, Inject, TypeReflectsToken, Singleton } from '@tsdi/ioc';
import { Aspect, AopModule, Around, Joinpoint } from '@tsdi/aop';
import { LogConfigure, LogModule } from '@tsdi/logs';
import * as net from 'net';
import { ServerBootstrapModule } from '@tsdi/platform-server-boot';
import { ServerLogsModule } from '@tsdi/platform-server-logs';

export class TestService {
    testFiled = 'test';
    test() {
        console.log('this is test');
    }
}

@DIModule({
    imports: [
        TestService
    ],
    exports: [
        TestService
    ]
})
export class ModuleCustom {

}

@DIModule({
    imports: [
        ModuleCustom
    ],
    providers: [
        { provide: 'mark', useFactory: () => 'marked' }
    ],
    exports: [
        ModuleCustom
    ]
})
export class ModuleA {

}

@Injectable
export class ClassSevice extends Startup {
    async configureService(ctx: IBootContext): Promise<void> {

    }

    @Inject('mark')
    mark: string;
    state: string;

    async startup(): Promise<any> {
        console.log('ClassSevice running.....');
        let refs = this.getContext().reflects;
        // console.log(refs.get(ClassSevice));

        // console.log(this.container);
    }

}

@Aspect
export class Logger {

    @Around('execution(*.run)')
    log(jp: Joinpoint) {
        console.log(jp.fullName, jp.state, 'run........');
    }

    @Around('execution(*.test)')
    logTest() {
        console.log('test........');
    }
}

@Message()
export class SubMessageQueue extends MessageQueue {

}

@DIModule({
    imports: [
        AopModule,
        LogModule,
        Logger,
        ClassSevice,
        ModuleA,
        SubMessageQueue
    ],
    bootstrap: ClassSevice
})
export class ModuleB {
    constructor() {

    }

}


@Singleton()
export class SocketService extends StartupService<IBootContext> {

    public tcpServer: net.Server;
    private context: IBootContext;

    async configureService(ctx: IBootContext): Promise<void> {
        console.log('SocketService init...')
        this.context = ctx;
        const tcpServer = this.tcpServer = new net.Server();
        tcpServer.listen(8801);
    }

    protected destroying() {
        console.log('SocketService destroying...');
        this.tcpServer.removeAllListeners();
        this.tcpServer.close();
    }

}

@DIModule({
    providers: [
        SocketService
    ]
})
export class StatupModule {
    constructor() { }
}




@DIModule({
    imports: [
        AopModule,
        LogModule,
        Logger,
        ServerBootstrapModule,
        ServerLogsModule,
        ClassSevice,
        StatupModule,
        SubMessageQueue
    ],
    bootstrap: ClassSevice
})
export class ServerMainModule { }

export const configurtion = {
    logConfig: <LogConfigure>{
        // adapter: 'console',
        // config: {
        //     level: 'trace'
        // },
        adapter: 'log4js',
        config: {
            appenders: <any>{
                focas: {
                    type: 'dateFile',
                    pattern: '-yyyyMMdd.log',
                    filename: 'log-caches/focas',
                    backups: 3,
                    alwaysIncludePattern: true,
                    category: 'focas'
                },
                console: { type: 'console' }
            },
            categories: {
                default: {
                    appenders: ['focas', 'console'],
                    level: 'info'
                },
                focas: {
                    appenders: ['focas', 'console'],
                    level: 'info'
                }
            },
            pm2: true
        }
    }
} as Configure;


