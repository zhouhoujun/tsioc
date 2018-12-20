import {
    MetaAccessor, IContainer, Token, isString, InjectMetaAccessorToken,
    Injectable, Refs, MetaAccessorToken
} from '@ts-ioc/core';
import { IActivity, InjectAcitityToken, ActivityConfigure } from '../core';
import { ApplicationBuilderToken } from '@ts-ioc/bootstrap';

export const ActivityMetaAccessorToken = new InjectMetaAccessorToken('@Task');

/**
 * activity metadata accessor.
 *
 * @export
 * @class ActivityMetaAccessor
 * @extends {MetaAccessor}
 */
@Injectable(ActivityMetaAccessorToken)
@Refs(ApplicationBuilderToken, MetaAccessorToken)
export class ActivityMetaAccessor extends MetaAccessor {

    getToken(config: ActivityConfigure, container: IContainer): Token<IActivity> {
        let token = this.getTokenInConfig(config);
        if (this.validateToken(token)) {
            return token;
        } else if (isString(token)) {
            return this.traslateStrToken(token, container);
        }
        return null;
    }

    getTokenInConfig(config: ActivityConfigure) {
        return config.activity || config.task || config.token || config.type;
    }

    protected traslateStrToken(token: string, container: IContainer): Token<IActivity> {
        let taskToken = new InjectAcitityToken(token);
        if (container && container.has(taskToken)) {
            return taskToken;
        }
        return token;
    }
}
