import { DIModule, OnModuleStart, ContainerPoolToken } from '../src';
import { Injectable, Inject, IContainer, ContainerToken } from '@ts-ioc/core';
import { Aspect, AopModule, Around, Joinpoint } from '@ts-ioc/aop';
import { DefaultApplicationBuilder, AnyApplicationBuilder } from '../src';
import { LogModule } from '@ts-ioc/logs';

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
export class ClassSevice {
    @Inject('mark')
    mark: string;
    state: string;
    start() {
        console.log('-------log mark---------');
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
        LogModule,
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
        console.log(container.has('mark'), container.get('mark'));
        console.log(container, container.getResolvers());
        console.log('container pools defaults..................\n');
        // console.log(pools.getDefault());
        // console.log(container.resolveChain.toArray()[1]);
        // console.log(container.resolve(TestService));
        console.log(test);
        test.test();

        // console.log('container pools..................\n');
        // console.log(container);
    }
    mdOnStart(instance: ClassSevice): void | Promise<any> {
        console.log('mdOnStart...');
        // console.log(this.container);
        console.log(instance);
        instance.start();
        instance.state = 'started';
    }
}

// // test
// DefaultApplicationBuilder.create()
//     // .use(AopModule).use(LogModule)
//     .bootstrap(ModuleB);
