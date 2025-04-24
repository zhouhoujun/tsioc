import { Class, Injectable, Injector, InvokeArguments, ReflectiveRef } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ComponentRef } from '../refs/component';
import { ViewRef } from '../refs/view';
import { TemplateCompiler } from '../template/compiler';
import { ComponentDef } from '../decorators/component';
import { reactive } from './reactive';

export class ComponentRefImpl<T> implements ComponentRef<T> {

    constructor(
        private typeRef: ReflectiveRef<T>,
        readonly compiler: TemplateCompiler,
        options?: InvokeArguments<any>) {
    }

    get injector(): Injector {
        return this.typeRef.injector
    }

    destroy(): void {
        throw new Error('Method not implemented.');
    }

    onDestroy(callback: () => void): void {
        throw new Error('Method not implemented.');
    }
    
    get hostView(): ViewRef {
        throw new Error('Method not implemented.');
    }
    
    private _inst?: T;
    get instance(): T {
        if(!this._inst) {
            this._inst = this.createInstance()
        }
        return this._inst;
    }


    async render(): Promise<void> {
        const def = this.typeRef.class.getAnnotation<ComponentDef>();
        const template = def.template || await fetchTemplate(def.templateUrl!);
        this.compiler.compile(template, this);
    }

    protected createInstance(): T {
        const instance = this.typeRef.getInstance();
        return reactive(instance, this.injector.get(ReactiveEffect))
    }

}

@Injectable()
export class ComponentFactoryImpl {
    constructor(protected compiler: TemplateCompiler) {
    }
    create<T>(typeRef: ReflectiveRef<T>, options?: InvokeArguments<any>): ComponentRef<T> {
        return new ComponentRefImpl(typeRef, this.compiler, options);
    }
}


async function fetchTemplate(url: string): Promise<string> {
    const response = await fetch(url);
    return await response.text();
}

