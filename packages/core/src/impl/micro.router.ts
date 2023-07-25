import { ArgumentExecption, Injectable, Injector } from '@tsdi/ioc';
import { PatternFormatter } from '@tsdi/common';
import { MappingRouter, RouteMatcher, Routes } from '../transport';
import { MESSAGE_ROUTERS, MircoServRouter, MircoServRouters } from '../transport/router.micro';

@Injectable()
export class MircoServiceRouterImpl implements MircoServRouters {

    private defaultProtocol?: string;
    private _rts?: Map<string, MircoServRouter> | null;
    constructor(
        private injector: Injector
    ) {
    }

    protected get routers(): Map<string, MircoServRouter> {
        if (!this._rts) {
            this._rts = new Map();
            this.injector.get(MESSAGE_ROUTERS).forEach(r => {
                if (!this.defaultProtocol) {
                    this.defaultProtocol = r.protocol;
                }
                this._rts?.set(r.protocol, r);
            })
        }
        return this._rts;
    }


    get<T>(protocol?: string): MircoServRouter<T> {
        if (!protocol && this.routers.size > 1) throw new ArgumentExecption('has mutil microservice, protocol param can not empty');
        return this.routers.get(protocol ?? this.defaultProtocol!) as MircoServRouter<T>;
    }

}


export class MessageRouterImpl extends MappingRouter {

    protected micro = true;

    constructor(
        readonly protocol: string,
        injector: Injector,
        matcher: RouteMatcher,
        formatter: PatternFormatter,
        prefix?: string,
        routes?: Routes) {
        super(injector, matcher, formatter, prefix, routes)
    }
}

