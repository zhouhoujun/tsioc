import { ArgumentExecption, Injectable, Injector } from '@tsdi/ioc';
import { MappingRouter, RouteMatcher, Routes } from '../transport';
import { MESSAGE_ROUTERS, MessageRouter, MircoRouterOption, MircoServiceRouter } from '../transport/router.micro';

@Injectable()
export class MircoServiceRouterImpl implements MircoServiceRouter {

    private defaultProtocol?: string;
    private _rts?: Map<string, MessageRouter> | null;
    constructor(
        private injector: Injector,
        readonly matcher: RouteMatcher,
    ) {
    }

    protected get routers(): Map<string, MessageRouter> {
        if (!this._rts) {
            this._rts = new Map();
            this.injector.get(MESSAGE_ROUTERS).forEach(r => {
                if(!this.defaultProtocol) {
                    this.defaultProtocol = r.protocol;
                }
                this._rts?.set(r.protocol, r);
            })
        }
        return this._rts;
    }


    get<T>(protocol?: string): MessageRouter<T> {
        if (!protocol && this.routers.size > 1) throw new ArgumentExecption('has mutil microservice, protocol param can not empty');
        return this.routers.get(protocol ?? this.defaultProtocol!) as MessageRouter<T>;
    }

    register<T>(options: MircoRouterOption): MessageRouter<T> {
        const protocol = options.protocol;
        if (!this.defaultProtocol) {
            this.defaultProtocol = protocol;
        }
        if (!this.routers.has(protocol)) return this.routers.get(protocol) as MessageRouter<T>;

        const router = new MessageRouterImpl(protocol, options.injector ?? this.injector, options.matcher ?? this.matcher, options.prefix, options.routes);
        this.injector.inject({ provide: MESSAGE_ROUTERS, useValue: router, multi: true });
        this._rts = null;

        return router as MessageRouter<T>;
    }

}


export class MessageRouterImpl extends MappingRouter {

    constructor(
        readonly protocol: string,
        injector: Injector,
        matcher: RouteMatcher,
        prefix?: string,
        routes?: Routes) {
        super(injector, matcher, prefix, routes)
    }
}

