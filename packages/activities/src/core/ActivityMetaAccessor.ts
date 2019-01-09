import {
    MetaAccessor, IContainer, Token, InjectMetaAccessorToken,
    Refs, MetaAccessorToken, Singleton
} from '@ts-ioc/core';
import { ApplicationBuilderToken } from '@ts-ioc/bootstrap';
import { ActivityConfigure } from './ActivityConfigure';
import { IActivity } from './IActivity';

export const ActivityMetaAccessorToken = new InjectMetaAccessorToken('@Task');

/**
 * activity metadata accessor.
 *
 * @export
 * @class ActivityMetaAccessor
 * @extends {MetaAccessor}
 */
@Singleton(ActivityMetaAccessorToken)
@Refs(ApplicationBuilderToken, MetaAccessorToken)
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

        // if (isToken(config.selector)) {
        //     let sel = container.resolve(config.selector);
        //     if (sel) {
        //         return sel.getToken(config);
        //     }
        // }
        return null;
    }
}
