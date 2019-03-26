
import { RuntimeDecoratorAction } from './RuntimeDecoratorAction';
import { IocDecoratorScope } from '../IocDecoratorScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { RuntimeDecoratorRegisterer, MetadataService } from '../../services';
import { DecoratorType } from '../../factories';

export class RuntimeParamScope extends IocDecoratorScope {
    protected initDecoratorScope(ctx: RuntimeActionContext): void {
        if (!ctx.paramDecors) {
            ctx.paramDecors = this.container.get(MetadataService)
                .getParameterDecorators(ctx.targetType, ctx.propertyKey)
                .reduce((obj, dec) =>  {
                    obj[dec] = false;
                    return obj;
                }, {})
        }
    }
    protected filter(ctx: RuntimeActionContext, dec: string): boolean {
        return !ctx.paramDecors[dec];
    }
    protected done(ctx: RuntimeActionContext): boolean {
        return ctx.paramDecors[ctx.currDecoractor] = true;
    }
    protected isCompleted(ctx: RuntimeActionContext): boolean {
        return ctx.isParamCompleted();
    }
    protected getDecorators(ctx: RuntimeActionContext): string[] {
        let reg = this.container.get(RuntimeDecoratorRegisterer);
        return Object.keys(ctx.paramDecors).filter(dec => reg.has(dec, this.getDecorType()));
    }
    protected getDecorType(): DecoratorType {
        return DecoratorType.Parameter;
    }
    setup() {
        this.use(RuntimeDecoratorAction);
    }
}
