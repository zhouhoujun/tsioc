import { InjectToken } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { BootContext } from './BootContext';

export const ContextScopeToken = new InjectToken<IContextScope>('BOOT_ContextScope');

export interface IContextScope<T extends BootContext = BootContext> {
    getScopes(container: IContainer, scope: any): any[];
    getBootTarget(ctx: T): any;
}
