import { DIModule, Message, MessageQueue, StartupService, ApplicationContext, Boot, Configuration, Runnable, TargetRef, Runner } from '@tsdi/core';
import { Injectable, Inject, Singleton } from '@tsdi/ioc';
import { Aspect, AopModule, Around, Joinpoint } from '@tsdi/aop';
import { LogConfigure, LogModule } from '@tsdi/logs';
import * as net from 'net';
import { ServerBootstrapModule, ServerLogsModule } from '@tsdi/platform-server';

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

@Injectable()
export class ClassSevice extends Runner {

    constructor(readonly targetRef: TargetRef) {
        super()
    }

    get instance() {
        return this.targetRef.instance;
    }

    @Inject('mark')
    mark!: string;

    state!: string;

    override async run(): Promise<any> {
        console.log('ClassSevice running.....');
        // console.log(refs.get(ClassSevice));

        // console.log(this.container);
    }

}

@Aspect()
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
export class ModuleB { }


@Boot()
export class SocketService extends StartupService {

    public tcpServer!: net.Server;
    private context!: ApplicationContext;
    private init_times = 0;

    override async configureService(ctx: ApplicationContext): Promise<void> {
        console.log('SocketService init...')
        this.context = ctx;
        const tcpServer = this.tcpServer = new net.Server();
        tcpServer.listen(8801);
        this.init_times++;
        console.log('destroyed state', this.destroyed, 'init', this.init_times);
    }

    protected override destroying() {
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
export class StatupModule { }


@DIModule({
    imports: [
        AopModule,
        LogModule,
        Logger,
        ServerBootstrapModule,
        ServerLogsModule
    ],
    providers:[
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
} as Configuration;