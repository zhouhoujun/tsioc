import { Injectable, Refs } from '@tsdi/ioc';
import { IBuildContext } from '@tsdi/boot';
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
        return this.context.getValue(PlatformServiceToken) ?? this.getPlatform();
    }

    protected getPlatform() {
        let pf = this.injector.getInstance(PlatformServiceToken, {provide: NodeActivityContext, useValue: this});
        pf && this.setValue(PlatformServiceToken, pf);
        return pf;
    }

}

