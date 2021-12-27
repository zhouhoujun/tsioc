import { EMPTY, Injector, InvokeOption, isFunction, isUndefined, lang, OperationRef, refl, Type, TypeReflect } from '@tsdi/ioc';
import { Middleware, MiddlewareRef, MiddlewareRefFactory, MiddlewareRefFactoryResolver } from './middleware';
import { HandleMetadata } from '../metadata/meta';
import { Context } from './context';
import { CanActive } from './guard';
import { joinprefix, RouteOption } from './route';


/**
 * middleware ref.
 */
export class DefaultMiddlewareRef<T extends Middleware = Middleware> extends MiddlewareRef<T> implements OperationRef<T> {
    private metadata: HandleMetadata;
    private _url: string;
    constructor(reflect: TypeReflect<T>, injector: Injector, option?: RouteOption) {
        super(reflect, injector, option);
        this.metadata = reflect.annotation as HandleMetadata;
        this._url = (this.metadata.prefix || this.metadata.route) ?
            joinprefix(option?.prefix, this.metadata.prefix, this.metadata.route) : '';
        if (this._url) {
            this.root.arguments['prefix'] = this._url;
        }
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
        return this._url;
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
        if (this.protocols.indexOf(ctx.protocol) < 0) return false;
        if (ctx.status && ctx.status !== 404) return false;
        if (!ctx.path.startsWith(this.url)) return false;
        if (this.guards && this.guards.length) {
            if (!(await lang.some(
                this.guards.map(token => () => ctx.injector.resolve({ token, regify: true })?.canActivate(ctx)),
                vaild => vaild === false))) return false;
        }
        return true;
    }

}

export class DefaultMiddlewareRefFactory<T extends Middleware> extends MiddlewareRefFactory<T> {
    constructor(readonly reflect: TypeReflect<T>) {
        super()
    }
    create(injector: Injector, option?: InvokeOption): MiddlewareRef<T> {
        return new DefaultMiddlewareRef(this.reflect, injector, option) as MiddlewareRef<T>;
    }

}

export class DefaultMiddlewareRefFactoryResolver extends MiddlewareRefFactoryResolver {
    resolve<T extends Middleware<Context>>(type: Type<T> | TypeReflect<T>): MiddlewareRefFactory<T> {
        return new DefaultMiddlewareRefFactory(isFunction(type) ? refl.get(type) : type);
    }
}