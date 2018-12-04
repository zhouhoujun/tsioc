import { ModuelValidate, isString, Token, IContainer, InjectModuleValidateToken, Injectable } from '@ts-ioc/core';
import { ActivityConfigure } from './ActivityConfigure';
import { InjectAcitityToken, IActivity, ActivityToken } from './IActivity';
import { Task } from '../decorators';

/**
 * activity vaildate token
 */
export const ActivityVaildateToken = new InjectModuleValidateToken(ActivityToken);

@Injectable(ActivityVaildateToken)
export class ActivityVaildate extends ModuelValidate {
    getDecorator(): string | string[] {
        return Task.toString();
    }

    getToken(config: ActivityConfigure, container?: IContainer): Token<IActivity> {
        let token = this.getTokenInConfig(config);
        if (this.validateToken(token, container)) {
            return token;
        } else if (isString(token)) {
            return this.traslateStrToken(token, container);
        }
        return null;
    }

    getTokenInConfig(config: ActivityConfigure) {
        return config.activity || config.task || config.token || config.type;
    }

    protected traslateStrToken(token: string, container?: IContainer): Token<IActivity> {
        let taskToken = new InjectAcitityToken(token);
        if (container && container.has(taskToken)) {
            return taskToken;
        }
        return token;
    }
}
