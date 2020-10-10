import { DesignContext, isClass, lang } from '@tsdi/ioc';
import { IMessageQueue } from '../messages/IMessageQueue';
import { RootMessageQueueToken } from '../tk';


export const MessageRegisterAction = function (ctx: DesignContext, next: () => void): void {
    const classType = ctx.type;
    let reflect = ctx.targetReflect;
    const { parent, before, after } = reflect.getMetadata(ctx.currDecor);
    if (!parent || parent === 'none') {
        return next();
    }
    const injector = ctx.injector;
    let msgQueue: IMessageQueue;
    if (isClass(parent)) {
        msgQueue = injector.getContainer().getInjector(parent)?.get(parent);
    } else {
        msgQueue = injector.getInstance(RootMessageQueueToken);
    }

    if (!msgQueue) {
        throw new Error(lang.getClassName(parent) + 'has not registered!')
    }

    if (before) {
        msgQueue.useBefore(classType, before);
    } else if (after) {
        msgQueue.useAfter(classType, after);
    } else {
        msgQueue.use(classType);
    }
    next();
};
