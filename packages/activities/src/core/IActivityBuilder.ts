import { Token } from '@ts-ioc/ioc';
import { IAnnotationBuilder, InjectAnnotationBuilder } from '@ts-ioc/bootstrap';
import { IActivity, ActivityToken } from './IActivity';

/**
 * Inject Acitity builder Token
 *
 * @export
 * @class InjectAcitityBuilderToken
 * @extends {Registration<T>}
 * @template T
 */
export class InjectAcitityBuilderToken<T extends IActivity> extends InjectAnnotationBuilder<T> {
    constructor(type: Token<T>) {
        super(type);
    }
}

/**
 * activity boot builder.
 *
 * @export
 * @interface IActivityBuilder
 * @extends {IAnnotationBuilder<IActivity>}
 */
export interface IActivityBuilder extends IAnnotationBuilder<IActivity> {

}

/**
 * activity builder token.
 */
export const ActivityBuilderToken = new InjectAcitityBuilderToken<IActivity>(ActivityToken);
