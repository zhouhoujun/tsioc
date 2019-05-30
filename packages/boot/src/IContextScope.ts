import { InjectToken } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';

export const ContextScopeToken = new InjectToken<IContextScope<any>>('BOOT_ContextScope');

export interface IContextScope<T> {
    getScopes(container: IContainer, scope: any): any[];
    getBoot(ctx: T): any;
}
