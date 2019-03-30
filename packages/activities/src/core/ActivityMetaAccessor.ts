import {
    IContainer
} from '@tsdi/core';
import { Token, Refs, Singleton } from '@tsdi/ioc'
import { ApplicationBuilder, MetaAccessor } from '@tsdi/boot';
import { ActivityConfigure } from './ActivityConfigure';
import { IActivity } from './IActivity';


/**
 * activity metadata accessor.
 *
 * @export
 * @class ActivityMetaAccessor
 * @extends {MetaAccessor}
 */

@Refs('@Task', MetaAccessor)
@Refs(ApplicationBuilder, MetaAccessor)
@Singleton()
export class ActivityMetaAccessor extends MetaAccessor {

    getToken(config: ActivityConfigure, container: IContainer): Token<IActivity> {
        let token = this.getTokenInConfig(config);
        if (this.validateToken(token)) {
            return token;
        }
        return null;
    }

    getTokenInConfig(config: ActivityConfigure) {
        return config.activity || config.task || config.token || config.type;
    }

    getBootToken(config: ActivityConfigure, container?: IContainer): Token<any> {
        let token = this.getBootTokenInConfig(config);
        if (this.validateToken(token, container)) {
            return token
        }
        return null;
    }
}
