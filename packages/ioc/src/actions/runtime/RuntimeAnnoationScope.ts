import { RuntimeDecoratorAction } from './RuntimeDecoratorAction';
import { RuntimeActionContext } from './RuntimeActionContext';
import { IocDecoratorScope } from '../IocDecoratorScope';
import { RuntimeDecoratorRegisterer, MetadataService } from '../../services';
import { DecoratorType } from '../../factories';

export class RuntimeAnnoationScope extends IocDecoratorScope {

    protected initDecoratorScope(ctx: RuntimeActionContext): void {
        if (!ctx.classDecors) {
            ctx.classDecors = this.container.get(MetadataService)
                .getClassDecorators(ctx.targetType)
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
    }

    protected filter(ctx: RuntimeActionContext, dec: string): boolean {
        return !ctx.classDecors[dec];
    }
    protected done(ctx: RuntimeActionContext): boolean {
        return ctx.classDecors[ctx.currDecoractor] = true;
    }
    protected isCompleted(ctx: RuntimeActionContext): boolean {
        return ctx.isClassCompleted();
    }
    protected getDecorators(ctx: RuntimeActionContext): string[] {
        let reg = this.container.get(RuntimeDecoratorRegisterer);
        let classDecors = Object.keys(ctx.classDecors);
        return Array.from(reg.getDecoratorMap(this.getDecorType()).keys())
            .filter(dec => classDecors.indexOf(dec) >= 0);
    }
    protected getDecorType(): DecoratorType {
        return DecoratorType.Class;
    }

    setup() {
        this.use(RuntimeDecoratorAction);
    }
}
