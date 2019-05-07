import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';


export class BootContextCheckHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx && ctx instanceof BootContext) {
            await next();
        }
    }
}
