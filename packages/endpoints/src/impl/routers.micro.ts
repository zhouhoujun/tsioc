import { ArgumentExecption, Injectable, Injector } from '@tsdi/ioc';
import { MESSAGE_ROUTERS, MircoRouter, MicroRouters } from '../router/routers.micro';


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


    get(protocol?: string): MircoRouter {
        if (!protocol && this.routers.size > 1) throw new ArgumentExecption('has mutil microservice, protocol param can not empty');
        return this.routers.get(protocol ?? this.defaultProtocol!) as MircoRouter;
    }

}
