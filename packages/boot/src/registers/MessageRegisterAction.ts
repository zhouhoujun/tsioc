import { DesignContext, CTX_CURR_DECOR, isClass } from '@tsdi/ioc';
import { RootMessageQueueToken } from '../messages/IMessageQueue';
import { MessageMetadata } from '../decorators/Message';


export const MessageRegisterAction = function (ctx: DesignContext, next: () => void): void {
    let metas = ctx.reflects.getMetadata<MessageMetadata>(ctx.getValue(CTX_CURR_DECOR), ctx.type);
    const { regIn, before, after } = metas.find(meta => !!meta.before || !!meta.after) || <MessageMetadata>{};
    if (!regIn || regIn === 'none') {
        return next();
    }
    const injector = ctx.injector;
    let msgQueue = injector.getInstance(RootMessageQueueToken);
    if (isClass(regIn)) {
        if (!injector.hasRegister(regIn)) {
            injector.registerType(regIn);
        }
        msgQueue = injector.getInstance(regIn);
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
