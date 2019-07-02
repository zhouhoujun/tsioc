import { InjectToken } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';

export const ContextScopeToken = new InjectToken<IContextScope>('BOOT_ContextScope');

export interface IContextScope<T = any> {
    getScopes(container: IContainer, scope: any): any[];
    getBoot(ctx: T): any;
}
