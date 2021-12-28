import { DestroyCallback, EMPTY, Injector, InvokeOption, isFunction, isUndefined, lang, OperationFactory, OperationFactoryResolver, refl, Type, TypeReflect } from '@tsdi/ioc';
import { Middleware, MiddlewareRef, MiddlewareRefFactory, MiddlewareRefFactoryResolver } from './middleware';
import { HandleMetadata } from '../metadata/meta';
import { Context } from './context';
import { CanActive } from './guard';
import { joinprefix, RouteOption } from './route';


/**
 * middleware ref.
 */
export class DefaultMiddlewareRef<T extends Middleware = Middleware> extends MiddlewareRef<T> {
    private _destroyed = false;
    private _dsryCbs = new Set<DestroyCallback>();

    private metadata: HandleMetadata;
    private _url: string;
    private factory: OperationFactory<T>;
    constructor(public reflect: TypeReflect<T>, public injector: Injector, option?: RouteOption) {
        super();
        this.factory = injector.get(OperationFactoryResolver).resolve(reflect, injector, option);
        this.metadata = reflect.annotation as HandleMetadata;
        this._url = (this.metadata.prefix || this.metadata.route) ?
            joinprefix(option?.prefix, this.metadata.prefix, this.metadata.route) : '';
        if (this._url) {
            this.factory.context.arguments['prefix'] = this._url;
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
        return this.factory.resolve().handle(ctx, next);
    }

    get type() {
        return this.factory.type;
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

    get destroyed() {
        return this._destroyed;
    }

    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            try {
                this._dsryCbs.forEach(cb => isFunction(cb) ? cb() : cb?.onDestroy());
            } finally {
                this._dsryCbs.clear();
                this.factory.onDestroy();
                this.factory = null!;
                this.metadata = null!
                this.reflect = null!;
                this.injector = null!;
                this._url = null!;
            }
        }
    }

    onDestroy(callback?: DestroyCallback): void {
        if (callback) {
            this._dsryCbs.add(callback);
        } else {
            return this.destroy();
        }
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