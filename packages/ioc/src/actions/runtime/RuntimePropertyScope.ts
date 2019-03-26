
import { RuntimeDecoratorAction } from './RuntimeDecoratorAction';
import { IocDecoratorScope } from '../IocDecoratorScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { RuntimeDecoratorRegisterer, MetadataService } from '../../services';
import { DecoratorType } from '../../factories';

export class RuntimePropertyScope extends IocDecoratorScope {
    protected initDecoratorScope(ctx: RuntimeActionContext): void {
        if (!ctx.propsDecors) {
            ctx.propsDecors = this.container.get(MetadataService)
                .getPropertyDecorators(ctx.targetType)
                .reduce((obj, dec) =>  {
                    obj[dec] = false;
                    return obj;
                }, {})
        }
    }
    protected filter(ctx: RuntimeActionContext, dec: string): boolean {
        return !ctx.propsDecors[dec];
    }
    protected done(ctx: RuntimeActionContext): boolean {
        return ctx.propsDecors[ctx.currDecoractor] = true;
    }
    protected isCompleted(ctx: RuntimeActionContext): boolean {
        return ctx.isPropertyCompleted();
    }
    protected getDecorators(ctx: RuntimeActionContext): string[] {
        let reg = this.container.get(RuntimeDecoratorRegisterer);
        return Object.keys(ctx.propsDecors).filter(dec => reg.has(dec, this.getDecorType()));
    }
    protected getDecorType(): DecoratorType {
        return DecoratorType.Property;
    }
    setup() {
        this.use(RuntimeDecoratorAction);
    }
}
