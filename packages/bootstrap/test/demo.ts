import { DIModule, OnModuleStart } from '../src';
import { Injectable, Inject } from '@ts-ioc/core';

export class TestService {
    test() {
        console.log('test');
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


@DIModule({
    imports: [
        ModuleA
    ],
    exports: [
        ClassSevice
    ],
    bootstrap: ClassSevice
})
export class ModuleB implements OnModuleStart<ClassSevice> {
    constructor(test: TestService) {
        test.test();
    }
    mdOnStart(instance: ClassSevice): void | Promise<any> {
        instance.start();
        instance.state = 'started';
    }
}


