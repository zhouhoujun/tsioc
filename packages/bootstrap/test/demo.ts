import { DIModule, ModuleStart } from '../src';
import { Injectable, Inject } from '@ts-ioc/core';


@DIModule({
    providers: [
        { provide: 'mark', useFactory: () => 'marked' }
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
    start() {
        console.log(this.mark);
    }
}


@DIModule({
    imports: [
        ModuleA
    ],
    exports: [
        ModuleA
    ],
    bootstrap: ClassSevice
})
export class ModuleB implements ModuleStart<ClassSevice> {
    instance: ClassSevice;
    mdOnStart(instance: ClassSevice): void | Promise<any> {
        this.instance = instance;
        instance.start();
    }

}


