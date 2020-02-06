import { Injectable, Refs } from '@tsdi/ioc';
import { BuildContext } from '@tsdi/boot';
import { ActivityContext, CtxExpression, Activity } from '@tsdi/activities';
import { IPlatformService, PlatformServiceToken } from './IPlatformService';



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
@Refs(Activity, BuildContext)
export class NodeActivityContext extends ActivityContext {

    get platform(): IPlatformService {
        if (!this.hasValue(PlatformServiceToken)) {
            this.setValue(PlatformServiceToken, this.injector.getInstance(PlatformServiceToken));
        }
        return this.getValue(PlatformServiceToken);
    }

}

