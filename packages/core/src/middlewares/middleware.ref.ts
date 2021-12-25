import { DefaultTypeRef, EMPTY, Injectable, Injector, InvocationContext, InvokeOption, isUndefined, lang, OperationFactory, Type } from '@tsdi/ioc';
import { HandleMetadata } from '../metadata/meta';
import { Context } from './context';
import { CanActive } from './guard';
import { Middleware, MiddlewareRef, MiddlewareRefFactory } from './middleware';

/**
 * middleware ref.
 */
 export class DefaultMiddlewareRef<T extends Middleware = Middleware> extends DefaultTypeRef<T> implements MiddlewareRef {
    private metadata: HandleMetadata;
    constructor(factory: OperationFactory<T>, injector: Injector, root: InvocationContext, readonly prefix: string = '', instance?: T) {
        super(factory, injector, root, instance);
        this.metadata = factory.targetReflect.annotation as HandleMetadata;
    }

    async handle(ctx: Context, next: () => Promise<void>): Promise<void> {
        if (isUndefined(this.metadata.route)) {
            return await this.execute(ctx, next);
        }
        if (await this.canActive(ctx)) {
            return await this.execute(ctx, next);
        } else {
            return await next();
        }
    }

    protected execute(ctx: Context, next: () => Promise<void>): Promise<void> {
        return this.instance.handle(ctx, next);
    }

    get url() {
        return this.metadata.route ?? '';
    }

    get guards(): Type<CanActive>[] | undefined {
        return this.metadata.guards;
    }

    private _protocols!: string[];
    get protocols(): string[] {
        if (!this._protocols) {
            this._protocols = this.metadata.protocol?.split(';') ?? EMPTY;
        }
        return this._protocols;
    }


    protected async canActive(ctx: Context): Promise<boolean> {
        if (!((!ctx.status || ctx.status === 404) && ctx.vaild.isActiveRoute(ctx, this.url) === true)) return false;
        if (this.guards && this.guards.length) {
            if (!(await lang.some(
                this.guards.map(token => () => ctx.injector.resolve({ token, regify: true })?.canActivate(ctx)),
                vaild => vaild === false))) return false;
        }
        return true;
    }

}

@Injectable()
export class DefaultMiddlewareRefFactory extends MiddlewareRefFactory {
    create(factory: OperationFactory<Middleware>, injector: Injector, option?: InvokeOption): MiddlewareRef {
        return new DefaultMiddlewareRef(factory, injector, factory.createContext(injector, option));
    }

}