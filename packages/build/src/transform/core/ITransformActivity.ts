import { IActivityResult, InjectAcitityToken } from '@tsdi/activities';
import { ITransform } from './ITransform';

/**
 * pipe task.
 *
 * @export
 * @interface IPipeTask
 * @extends {IActivityResult}
 * @template T
 */
export interface ITransformActivity extends IActivityResult<ITransform> {

}


/**
 * Transform activity token.
 */
export const TransformActivityToken = new InjectAcitityToken<ITransformActivity>('transform');
