import { DesignDecoratorAction } from './DesignDecoratorAction';
import { DesignActionContext } from './DesignActionContext';
import { IocDecoratorScope } from '../IocDecoratorScope';
import { DesignDecoratorRegisterer } from '../../services';
import { DecoratorType } from '../../factories';

export class DesignMethodScope extends IocDecoratorScope {

    protected filter(ctx: DesignActionContext, dec: string): boolean {
        return !ctx.targetReflect.methodDecors[dec];
    }
    protected done(ctx: DesignActionContext): boolean {
        return ctx.targetReflect.methodDecors[ctx.currDecoractor] = true;
    }
    protected isCompleted(ctx: DesignActionContext): boolean {
        return ctx.isMethodCompleted();
    }
    protected getDecorators(ctx: DesignActionContext): string[] {
        let reg = this.container.get(DesignDecoratorRegisterer);
        return Object.keys(ctx.targetReflect.methodDecors).filter(dec => reg.has(dec, this.getDecorType()));
    }
    protected getDecorType(): DecoratorType {
        return DecoratorType.Method;
    }

    setup() {
        this.use(DesignDecoratorAction);
    }
}
