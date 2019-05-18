import { ActivityContext, Activity } from '@tsdi/activities';
import { Injectable, Refs } from '@tsdi/ioc';
import { BootContext } from '@tsdi/boot';
import { PlatformService } from './PlatformService';





/**
 * pipe activity context.
 *
 * @export
 * @class NodeActivityContext
 * @extends {ActivityContext}
 * @implements {IActivityContext<ITransform>}
 */
@Injectable
@Refs(Activity, BootContext)
@Refs('@Task', BootContext)
export class NodeActivityContext extends ActivityContext {

    private _platform: PlatformService;
    get platform(): PlatformService {
        if (!this._platform) {
            this._platform = this.getRaiseContainer().resolve(PlatformService);
        }
        return this._platform;
    }
}
