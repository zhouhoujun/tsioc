import { DesignDecoratorAction } from './DesignDecoratorAction';
import { DesignActionContext } from './DesignActionContext';
import { DesignDecoratorRegisterer } from '../../services';
import { DecoratorType } from '../../factories';
import { IocDecoratorScope } from '../IocDecoratorScope';

export class DesignAnnoationScope extends IocDecoratorScope {

    protected filter(ctx: DesignActionContext, dec: string): boolean {
        return !ctx.targetReflect.classDecors[dec];
    }
    protected done(ctx: DesignActionContext): boolean {
        return ctx.targetReflect.classDecors[ctx.currDecoractor] = true;
    }
    protected isCompleted(ctx: DesignActionContext): boolean {
        return ctx.isClassCompleted();
    }
    protected getDecorators(ctx: DesignActionContext): string[] {
        let reg = this.container.get(DesignDecoratorRegisterer);
        let classDecors = Object.keys(ctx.targetReflect.classDecors);
        return Array.from(reg.getDecoratorMap(this.getDecorType()).keys())
            .filter(dec => classDecors.indexOf(dec) >= 0);

    }
    protected getDecorType(): DecoratorType {
        return DecoratorType.Class;
    }

    setup() {
        this.use(DesignDecoratorAction);
    }

}
