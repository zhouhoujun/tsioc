import { IocDesignAction, DesignActionContext, CTX_CURR_DECOR } from '@tsdi/ioc';
import { RootMessageQueueToken } from '../messages/IMessageQueue';
import { MessageMetadata } from '../decorators/Message';


export class MessageRegisterAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        let container = ctx.getContainer();
        let msgQueue = container.get(RootMessageQueueToken);
        let metas = ctx.reflects.getMetadata<MessageMetadata>(ctx.get(CTX_CURR_DECOR), ctx.targetType);
        let { regIn, before, after } = metas.find(meta => !!meta.before || !!meta.after) || <MessageMetadata>{};
        if (regIn) {
            if (!container.has(regIn)) {
                container.register(regIn);
            }
            msgQueue = container.get(regIn);
        }
        if (before) {
            msgQueue.useBefore(ctx.targetType, before);
        } else if (after) {
            msgQueue.useAfter(ctx.targetType, after);
        } else {
            msgQueue.use(ctx.targetType);
        }

        next();
    }

}
