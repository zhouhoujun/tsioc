import { IContainer, ActionData, ActionComposite, ExtendsProvider } from '@ts-ioc/core';
import { AopActions } from './AopActions';
import { Advice, Aspect } from '../decorators';
import { AdviceMetadata } from '../metadatas';
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IPointcut, Joinpoint, JoinpointState, IJoinpoint } from '../joinpoints';
import { Advices, Advicer } from '../advices';
import { isValideAspectTarget } from '../isValideAspectTarget';

/**
 * extends instance action data.
 *
 * @export
 * @interface ExetndsInstanceActionData
 * @extends {ActionData<AdviceMetadata>}
 */
export interface ExetndsInstanceActionData extends ActionData<AdviceMetadata> {

}

/**
 * extends instance action.
 *
 * @export
 * @class ExetndsInstanceAction
 * @extends {ActionComposite}
 */
export class ExetndsInstanceAction extends ActionComposite {

    constructor() {
        super(AopActions.registAspect);
    }

    protected working(container: IContainer, data: ExetndsInstanceActionData) {
        // aspect class do nothing.
        if (!data.target || !data.providers || data.providers.length < 1) {
            return;
        }

        data.providers.forEach(p => {
            if (p && p instanceof ExtendsProvider) {
                p.extends(data.target);
            }
        });
    }
}
