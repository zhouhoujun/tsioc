import { DefaultInjector } from '.';
import { Injector } from '../injector';
import { ModuleRef } from '../module.ref';
import { Token } from '../tokens';
import { Type } from '../types';

export class DefaultModuleRef<T> extends DefaultInjector implements ModuleRef<T> {

    constructor(readonly moduleType: Type<T>, readonly parent: Injector) {
        super()
    }

    destroyCbs: (() => void)[] | null = [];


    get injector(): Injector {
        return this;
    }

    get instance(): T {
        throw new Error('Method not implemented.');
    }

    protected override isSelf(token: Token): boolean {
        if (token === ModuleRef) return true;
        return super.isSelf(token);
    }

    get<T>(token: Token<T>, notFoundValue?: T): T {
        if ((token as any) === ModuleRef) return this as any;
        throw new Error('Method not implemented.');
    }

    destroy(): void {
        this.injector.destroy();
    }
    onDestroy(callback: () => void): void {
        this.injector.onDestroy(callback);
    }
}


