import { ArgumentExecption, Injectable, Injector } from '@tsdi/ioc';
import { PatternFormatter } from '@tsdi/common';
import { RouteMatcher } from '../router/router';
import { Routes } from '../router/route';
import { MappingRouter } from '../router/router.mapping';
import { MESSAGE_ROUTERS, MircoRouter, MicroRouters } from '../router/routers';


@Injectable()
export class MicroRoutersImpl implements MicroRouters {

    private defaultProtocol?: string;
    private _rts?: Map<string, MircoRouter> | null;
    constructor(
        private injector: Injector
    ) {
    }

    protected get routers(): Map<string, MircoRouter> {
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


    get<T>(protocol?: string): MircoRouter<T> {
        if (!protocol && this.routers.size > 1) throw new ArgumentExecption('has mutil microservice, protocol param can not empty');
        return this.routers.get(protocol ?? this.defaultProtocol!) as MircoRouter<T>;
    }

}


export class MappingRouterImpl extends MappingRouter {

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

