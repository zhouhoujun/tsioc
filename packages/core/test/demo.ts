import {
    Module, Message, ConfigureService, ApplicationContext, Configuration, ComponentScan, OnDispose,
    Runnable, Middlewares, ApplicationConfiguration, Bean, Settings, HttpModule
} from '../src';
import { Injectable, Inject, OnDestroy, lang } from '@tsdi/ioc';
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
export class ClassSevice implements Runnable {

    @Logger() logger!: ILogger;

    @Inject('mark', { defaultValue: '' })
    mark!: string;

    state!: string;

    async run(): Promise<any> {
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
export class SubMessageQueue extends Middlewares {

}

@Module({
    exports: [
        AopModule,
        LogModule,
        HttpModule
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
export class SocketService implements ConfigureService, OnDispose {

    @Logger() logger!: ILogger;

    public tcpServer!: net.Server;
    private init_times = 0;

    async configureService(ctx: ApplicationContext): Promise<void> {
        this.logger.log('SocketService init...');
        const tcpServer = this.tcpServer = new net.Server();
        tcpServer.listen(8801);
        this.init_times++;
        this.logger.log('destroyed state', 'init', this.init_times);
    }

    async onDispose() {
        this.logger.log('SocketService destroying...');
        this.tcpServer.removeAllListeners();
        let defer = lang.defer();
        this.tcpServer.close(() => {
            this.logger.log('tcpServer closed...');
            defer.resolve();
        });
        await defer.promise;
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
    logConfig: {
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
    } as LogConfigure
} as ApplicationConfiguration;

@Configuration()
export class ConfiguraionManger {

    @Bean()
    settings(): Settings {
        return {
            
        };
    }

}