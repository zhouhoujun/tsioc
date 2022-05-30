import {
    Module, ConfigureService, ApplicationContext, Configuration, ComponentScan, OnDispose,
    Runnable, Bean, LoggerModule
} from '../src';
import { Injectable, Inject, lang, Abstract } from '@tsdi/ioc';
import { Aspect, Around, Joinpoint } from '@tsdi/aop';
import { Logger, LogConfigure, Log } from '@tsdi/logs';
import * as net from 'net';
import { ServerModule, ServerLogsModule } from '@tsdi/platform-server';

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

    @Log() logger!: Logger;

    @Inject('mark', { defaultValue: '' })
    mark!: string;

    state!: string;

    async run(): Promise<any> {
        this.logger.info('ClassSevice running.....');
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


@Module({
    exports: [
        LoggerModule
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
        ClassSevice
    ],
    bootstrap: ClassSevice
})
export class ModuleB { }


@ComponentScan()
export class SocketService implements ConfigureService, OnDispose {

    @Log() logger!: Logger;

    public tcpServer!: net.Server;
    private init_times = 0;

    async configureService(ctx: ApplicationContext): Promise<void> {
        this.logger.info('init...');
        const tcpServer = this.tcpServer = new net.Server();
        tcpServer.listen(8801);
        this.init_times++;
        this.logger.info('destroyed state', 'init', this.init_times);
    }

    async onDispose() {
        this.logger.info('destroying...');
        this.tcpServer.removeAllListeners();
        const defer = lang.defer();
        this.tcpServer.close(() => {
            this.logger.info('tcpServer closed...');
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
        ServerModule,
        SharedModule,
        ServerLogsModule,
        StatupModule,
    ],
    providers: [
        LoggerAspect,
        ClassSevice
    ],
    bootstrap: ClassSevice
})
export class ServerMainModule { }

export const logConfig = {
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
                filename: './log-caches/focas',
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
} as LogConfigure;


@Abstract()
export abstract class Settings implements Record<string, any> {

}
@Configuration()
export class ConfiguraionManger {

    @Bean()
    settings(): Settings {
        return {

        };
    }

}