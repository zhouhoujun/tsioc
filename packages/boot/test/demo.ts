import { Module, Message, MessageQueue, StartupService, ApplicationContext, Configuration, Runner, ComponentScan } from '@tsdi/core';
import { Injectable, Inject, Singleton, Destroy } from '@tsdi/ioc';
import { Aspect, AopModule, Around, Joinpoint } from '@tsdi/aop';
import { ILogger, LogConfigure, Logger, LogModule } from '@tsdi/logs';
import * as net from 'net';
import { ServerBootstrapModule, ServerLogsModule } from '@tsdi/platform-server';

export class TestService {
    testFiled = 'test';
    test() {
        console.log('this is test');
    }
}

@Module({
    imports: [
        TestService
    ],
    exports: [
        TestService
    ]
})
export class ModuleCustom {

}

@Module({
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

    @Logger() logger!: ILogger;

    @Inject('mark', { nullable:true })
    mark!: string;

    state!: string;

    override async run(): Promise<any> {
        this.logger.log('ClassSevice running.....');
        // console.log(refs.get(ClassSevice));

        // console.log(this.container);
    }

}

@Aspect()
export class LoggerAspect {

    @Around('execution(*.run)')
    log(jp: Joinpoint) {
        console.log(jp.fullName, jp.state, 'run........');
    }

    @Around('execution(*.test)')
    logTest() {
        console.log('test........');
    }

    @Around('execution(*.destroyed)')
    destoryedlog(jp: Joinpoint) {
        console.log(jp.fullName, jp.state, 'destroyed........');
    }
}

@Message()
export class SubMessageQueue extends MessageQueue {

}

@Module({
    exports: [
        AopModule,
        LogModule
    ]
})
export class SharedModule {

}


@Module({
    imports: [
        SharedModule,
        ModuleA
    ],
    providers: [
        LoggerAspect,
        ClassSevice,
        SubMessageQueue
    ],
    bootstrap: ClassSevice
})
export class ModuleB { }


@ComponentScan()
export class SocketService implements StartupService, Destroy {

    @Logger() logger!: ILogger;

    public tcpServer!: net.Server;
    private context!: ApplicationContext;
    private init_times = 0;

    async configureService(ctx: ApplicationContext): Promise<void> {
        this.logger.log('SocketService init...')
        this.context = ctx;
        const tcpServer = this.tcpServer = new net.Server();
        tcpServer.listen(8801);
        this.init_times++;
        this.logger.log('destroyed state', 'init', this.init_times);
    }

    destroy() {
        this.logger.log('SocketService destroying...');
        this.tcpServer.removeAllListeners();
        this.tcpServer.close();
    }

}

@Module({
    imports: [
        SharedModule
    ],
    providers: [
        SocketService
    ]
})
export class StatupModule { }

@Module({
    imports: [
        SharedModule,
        StatupModule,
        ServerBootstrapModule,
        ServerLogsModule
    ],
    providers: [
        LoggerAspect,
        ClassSevice,
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