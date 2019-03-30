import { DIModule, Runnable } from '../src';
import { Injectable, Inject } from '@tsdi/ioc';
import { Aspect, AopModule, Around, Joinpoint } from '@tsdi/aop';
import { LogModule } from '@tsdi/logs';


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
export class ClassSevice extends Runnable<any> {
    async onInit(): Promise<void> {
    }
    @Inject('mark')
    mark: string;
    state: string;
    start() {
        console.log('-------log mark---------');
        console.log(this.mark);
    }

    async run(data?: any): Promise<any> {
        console.log('running.....')
    }

    mdOnStart(instance: ClassSevice): void | Promise<any> {
        console.log('mdOnStart...');
        // console.log(this.container);
        console.log(instance);
        instance.start();
        instance.state = 'started';
    }
}

@Aspect
export class Logger {

    @Around('execution(*.start)')
    log(jp: Joinpoint) {
        console.log(jp.fullName, jp.state, 'start........');
    }

    @Around('execution(*.test)')
    logTest() {
        console.log('test........');
    }
}


@DIModule({
    imports: [
        ClassSevice,
        AopModule,
        LogModule,
        Logger,
        ModuleA
    ],
    exports: [
        ClassSevice
    ],
    bootstrap: ClassSevice
})
export class ModuleB {
    constructor() {

    }

}

// // test
// DefaultApplicationBuilder.create()
//     // .use(AopModule).use(LogModule)
//     .bootstrap(ModuleB);
