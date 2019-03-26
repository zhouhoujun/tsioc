import { RuntimeDecoratorAction } from './RuntimeDecoratorAction';
import { IocDecoratorScope } from '../IocDecoratorScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { RuntimeDecoratorRegisterer, MetadataService } from '../../services';
import { DecoratorType } from '../../factories';

export class RuntimeMethodScope extends IocDecoratorScope {
    protected initDecoratorScope(ctx: RuntimeActionContext): void {
        if (!ctx.methodDecors) {
            ctx.methodDecors = this.container.get(MetadataService)
                .getMethodDecorators(ctx.targetType)
                .reduce((obj, dec) =>  {
                    obj[dec] = false;
                    return obj;
                }, {})
        }
    }
    protected filter(ctx: RuntimeActionContext, dec: string): boolean {
        return !ctx.methodDecors[dec];
    }
    protected done(ctx: RuntimeActionContext): boolean {
        return ctx.methodDecors[ctx.currDecoractor] = true;
    }
    protected isCompleted(ctx: RuntimeActionContext): boolean {
        return ctx.isMethodCompleted();
    }
    protected getDecorators(ctx: RuntimeActionContext): string[] {
        let reg = this.container.get(RuntimeDecoratorRegisterer);
        return Object.keys(ctx.methodDecors).filter(dec => reg.has(dec, this.getDecorType()));
    }
    protected getDecorType(): DecoratorType {
        return DecoratorType.Method;
    }
    setup() {
        this.use(RuntimeDecoratorAction);
    }
}
