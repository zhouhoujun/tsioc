import { DIModule, Startup, Message, MessageQueue, IBootContext, StartupService } from '../src';
import { Injectable, Inject, TypeReflectsToken, Singleton } from '@tsdi/ioc';
import { Aspect, AopModule, Around, Joinpoint } from '@tsdi/aop';
import { LogModule } from '@tsdi/logs';
import * as net from 'net';

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
