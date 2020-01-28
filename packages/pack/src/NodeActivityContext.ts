import { Injectable, Refs } from '@tsdi/ioc';
import { BootContext } from '@tsdi/boot';
import { ActivityContext, CtxExpression } from '@tsdi/activities';
import { IPlatformService, PlatformServiceToken } from './IPlatformService';
import { NodeActivity } from './NodeActivity';



export type NodeExpression<T = any> = CtxExpression<T, NodeActivityContext>;

/**
 * pipe activity context.
 *
 * @export
 * @class NodeActivityContext
 * @extends {ActivityContext}
 * @implements {IActivityContext<ITransform>}
 */
@Injectable
@Refs(NodeActivity, BootContext)
export class NodeActivityContext extends ActivityContext {

    private _platform: IPlatformService;
    get platform(): IPlatformService {
        if (!this._platform) {
            this._platform = this.getContainer().resolve(PlatformServiceToken);
        }
        return this._platform;
    }

}

