import { chain, DestroyCallback, EMPTY, Injector, isFunction, isUndefined, lang, OperationFactory, OperationFactoryResolver, refl, Type, TypeReflect } from '@tsdi/ioc';
import { Middleware } from './middleware';
import { MiddlewareRef, MiddlewareRefFactory, MiddlewareRefFactoryResolver } from './middlewares';
import { HandleMetadata } from './metadata/meta';
import { CanActivate } from '../transport/guard';
import { joinprefix, RouteOption } from './route';
import { TransportContext, promisify } from './context';

/**
 * middleware ref.
 */
export class DefaultMiddlewareRef<T extends Middleware = Middleware> extends MiddlewareRef<T> {
    private _destroyed = false;
    private _dsryCbs = new Set<DestroyCallback>();

    private metadata: HandleMetadata;
    private _url: string;
    private _instance: T | undefined;
    constructor(private factory: OperationFactory<T>, prefix?: string) {
        super();
        this.metadata = factory.reflect.annotation as HandleMetadata;
        this._url = (this.metadata.prefix || this.metadata.route) ?
            joinprefix(prefix, this.metadata.version, this.metadata.prefix, this.metadata.route) : '';
        if (this._url) {
            this.factory.context.setArgument('prefix', this._url);
        }
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.factory.resolve();
        }
        return this._instance;
    }

    async handle(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        if (isUndefined(this.metadata.route)) {
            return await this.execute(ctx, next);
        }
        if (await this.canActive(ctx)) {
            return await this.execute(ctx, next);
        } else {
            return await next();
        }
    }


    protected execute(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        return chain([(ctx, next) => this.instance.handle(ctx, next), ...this.handles], ctx, next);
    }

    get type() {
        return this.factory.type;
    }

    get reflect() {
        return this.factory.reflect;
    }

    get injector() {
        return this.factory.injector;
    }

    get url() {
        return this._url;
    }

    get guards(): Type<CanActivate>[] | undefined {
        return this.metadata.guards;
    }

    private _protocols!: string[];
    get protocols(): string[] {
        if (!this._protocols) {
            this._protocols = this.metadata.protocol?.split(';') ?? EMPTY;
        }
        return this._protocols;
    }


    protected async canActive(ctx: TransportContext): Promise<boolean> {
        if (this.protocols.indexOf(ctx.protocol) < 0) return false;
        if (ctx.sent) return false;
        if (!ctx.pattern.startsWith(this.url)) return false;
        if (this.guards && this.guards.length) {
            if (!(await lang.some(
                this.guards.map(token => () => promisify(this.factory.resolve(token)?.canActivate(ctx))),
                vaild => vaild === false))) return false;
        }
        return true;
    }

    get destroyed() {
        return this._destroyed;
    }

    destroy(): void | Promise<void> {
        if (!this._destroyed) {
            this._destroyed = true;
            try {
                this._dsryCbs.forEach(cb => isFunction(cb) ? cb() : cb?.onDestroy());
            } finally {
                this._dsryCbs.clear();
                this.metadata = null!;
                this._url = null!;
                this._instance = null!;
                const factory = this.factory;
                this.factory = null!;

                return factory.onDestroy();
            }
        }
    }

    onDestroy(callback?: DestroyCallback): void | Promise<void> {
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
    create(injector: Injector, option?: RouteOption): MiddlewareRef<T> {
        const factory = injector.get(OperationFactoryResolver).resolve(this.reflect, injector, option);
        if (option?.prefix) {
            factory.context.setArgument('prefix', option?.prefix);
        }
        return new DefaultMiddlewareRef(factory, option?.prefix);
    }

}

export class DefaultMiddlewareRefFactoryResolver extends MiddlewareRefFactoryResolver {
    resolve<T extends Middleware<TransportContext>>(type: Type<T> | TypeReflect<T>): MiddlewareRefFactory<T> {
        return new DefaultMiddlewareRefFactory(isFunction(type) ? refl.get(type) : type);
    }
}