import { ArgumentExecption, Injectable, Injector } from '@tsdi/ioc';
import { ProtocolType } from '@tsdi/common';
import { ROUTERS, Routers } from '../router/routers';
import { HybridRouter } from '../router/router.hybrid';


@Injectable()
export class RoutersImpl implements Routers {

    private defaultProtocol?: ProtocolType | 'default';
    private _rts?: Map<string, HybridRouter> | null;
    constructor(
        private injector: Injector
    ) {
    }

    protected get routers(): Map<string, HybridRouter> {
        if (!this._rts) {
            this._rts = new Map();
            this.injector.get(ROUTERS).forEach(r => {
                if (!this.defaultProtocol) {
                    this.defaultProtocol = r.protocol ?? 'default';
                }
                this._rts?.set(r.protocol ?? 'default', r);
            })
        }
        return this._rts;
    }


    get(protocol?: ProtocolType): HybridRouter {
        if (!protocol && this.routers.size > 1) throw new ArgumentExecption('has mutil microservice, protocol param can not empty');
        return this.routers.get(protocol ?? this.defaultProtocol ?? 'default') as HybridRouter;
    }

}
