import { IocDesignAction, DesignActionContext, getOwnTypeMetadata } from '@tsdi/ioc';
import { RootMessageQueueToken } from '../messages';
import { MessageMetadata } from '../decorators';
import { RootContainerToken } from '../ContainerPoolToken';


export class MessageRegisterAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        let msgQueue = this.container.get(RootContainerToken).get(RootMessageQueueToken);
        let metas = getOwnTypeMetadata<MessageMetadata>(ctx.currDecoractor, ctx.targetType);
        let meta = metas.find(meta => !!meta.before || !!meta.after);
        if (meta) {
            if (meta.regIn) {
                let comp = meta.regIn;
                if (!this.container.has(comp)) {
                    this.container.register(comp);
                }
                msgQueue = this.container.get(comp);
            }
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
