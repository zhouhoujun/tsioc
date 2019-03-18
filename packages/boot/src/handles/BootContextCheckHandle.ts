import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { Next } from '../core';
import { Singleton } from '@ts-ioc/ioc';

@Singleton
export class BootContextCheckHandle extends BootHandle {
    async execute(ctx: BootContext, next: Next): Promise<void> {
        if (ctx && ctx instanceof BootContext) {
            await next();
        }
    }
}
