import { IAnnotationBuilder, InjectAnnotationBuilder } from '@ts-ioc/bootstrap';
import { IActivity, ActivityToken } from './IActivity';

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
export const ActivityBuilderToken = new InjectAnnotationBuilder<IActivity>(ActivityToken);
