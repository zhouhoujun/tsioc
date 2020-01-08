import { DesignActionContext, CTX_CURR_DECOR } from '@tsdi/ioc';
import { RootMessageQueueToken } from '../messages/IMessageQueue';
import { MessageMetadata } from '../decorators/Message';


export const MessageRegisterAction = function (ctx: DesignActionContext, next: () => void): void {
    let injector = ctx.injector;
    let msgQueue = injector.get(RootMessageQueueToken);
    let metas = ctx.reflects.getMetadata<MessageMetadata>(ctx.get(CTX_CURR_DECOR), ctx.type);
    let { regIn, before, after } = metas.find(meta => !!meta.before || !!meta.after) || <MessageMetadata>{};
    if (regIn) {
        if (!injector.hasRegister(regIn)) {
            injector.registerType(regIn);
        }
        msgQueue = injector.get(regIn);
    }
    if (before) {
        msgQueue.useBefore(ctx.type, before);
    } else if (after) {
        msgQueue.useAfter(ctx.type, after);
    } else {
        msgQueue.use(ctx.type);
    }

    next();
};
