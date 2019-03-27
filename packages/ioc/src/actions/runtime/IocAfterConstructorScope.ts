import { IocDecoratorScope } from '../IocDecoratorScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { RuntimeDecoratorRegisterer } from '../../services';
import { DecoratorType } from '../../factories';
import { RuntimeDecoratorAction } from './RuntimeDecoratorAction';

/**
 * ioc register actions scope run after constructor.
 *
 * @export
 * @class IocAfterConstructorScope
 * @extends {IocRuntimeScopeAction}
 */
export class IocAfterConstructorScope extends IocDecoratorScope {
    protected initDecoratorScope(ctx: RuntimeActionContext): void {
        if (!ctx.afterCstrDecors) {
            ctx.afterCstrDecors = Array.from(this.container.get(RuntimeDecoratorRegisterer).getDecoratorMap(DecoratorType.AfterConstructor).keys())
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
    }
    protected filter(ctx: RuntimeActionContext, dec: string): boolean {
        return !ctx.afterCstrDecors[dec];
    }
    protected done(ctx: RuntimeActionContext): boolean {
        return ctx.afterCstrDecors[ctx.currDecoractor] = true;
    }
    protected isCompleted(ctx: RuntimeActionContext): boolean {
        return ctx.isPropertyCompleted();
    }
    protected getDecorators(ctx: RuntimeActionContext): string[] {
        let reg = this.container.get(RuntimeDecoratorRegisterer);
        let afterCstrDecors = Object.keys(ctx.afterCstrDecors);
        return Array.from(reg.getDecoratorMap(this.getDecorType()).keys())
            .filter(dec => afterCstrDecors.indexOf(dec) >= 0);
    }
    protected getDecorType(): DecoratorType {
        return DecoratorType.AfterConstructor;
    }
    setup() {
        this.use(RuntimeDecoratorAction);
    }
}
