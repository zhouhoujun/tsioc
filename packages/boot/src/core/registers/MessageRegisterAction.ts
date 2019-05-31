import { IocDesignAction, DesignActionContext, getOwnTypeMetadata } from '@tsdi/ioc';
import { RootContainerToken } from '@tsdi/boot';
import { MessageQueueToken } from '../messages';
import { MessageMetadata } from '../decorators';


export class MessageRegisterAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        let msgQueue = this.container.get(RootContainerToken).get(MessageQueueToken);
        let metas = getOwnTypeMetadata<MessageMetadata>(ctx.currDecoractor, ctx.targetType);
        let meta = metas.find(meta => !!meta.before || !!meta.after);
        if (meta) {
            if (meta.before) {
                msgQueue.useBefore(ctx.targetType, meta.before);
            } else if (meta.after) {
                msgQueue.useAfter(ctx.targetType, meta.after);
            }
        } else {
            msgQueue.use(ctx.targetType);
        }

        next();
    }
}
