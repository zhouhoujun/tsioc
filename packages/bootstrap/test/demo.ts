import { DIModule, OnModuleStart, ContainerPoolToken } from '../src';
import { Injectable, Inject, IContainer, ContainerToken } from '@ts-ioc/core';
import { Aspect, Before, AopModule, Around, Joinpoint } from '@ts-ioc/aop';


export class TestService {
    testFiled = 'test';
    test() {
        console.log('this is test');
    }
}

@DIModule({
    providers: [
        { provide: 'mark', useFactory: () => 'marked' },
        TestService
    ],
    exports: [

    ]
})
export class ModuleA {

}

@Injectable
export class ClassSevice {
    @Inject('mark')
    mark: string;
    state: string;
    start() {
        console.log(this.mark);
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
        AopModule,
        Logger,
        ModuleA
    ],
    exports: [
        ClassSevice
    ],
    bootstrap: ClassSevice
})
export class ModuleB implements OnModuleStart<ClassSevice> {
    constructor(test: TestService, @Inject(ContainerToken) private container: IContainer) {
        let pools = container.get(ContainerPoolToken);
        // console.log(pools);
        console.log('container pools defaults..................\n');
        console.log(pools.getDefault());

        console.log(test);
        test.test();

        // console.log('container pools..................\n');
        // console.log(container);
    }
    mdOnStart(instance: ClassSevice): void | Promise<any> {
        console.log('mdOnStart...');
        // console.log(this.container);
        instance.start();
        instance.state = 'started';
    }
}


