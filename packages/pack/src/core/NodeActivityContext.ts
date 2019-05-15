import { ActivityContext, Activity } from '@tsdi/activities';
import { Injectable, Refs, ProviderTypes } from '@tsdi/ioc';
import { BootContext, ProcessRunRootToken } from '@tsdi/boot';
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
            let provders: ProviderTypes[] = [{ provide: 'args', useValue: this.args }];
            if (this.baseURL) {
                provders.push({ provide: ProcessRunRootToken, useValue: this.baseURL });
            }
            this._platform = this.getRaiseContainer().resolve(PlatformService, ...provders);
        }
        return this._platform;
    }
}
