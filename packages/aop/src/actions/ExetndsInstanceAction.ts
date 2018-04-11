import { IContainer, ActionData, ActionComposite, ExtendsProvider } from '@ts-ioc/core';
import { AopActions } from './AopActions';
import { Advice, Aspect } from '../decorators/index';
import { AdviceMetadata } from '../metadatas/index';
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IPointcut, Joinpoint, JoinpointState, IJoinpoint } from '../joinpoints/index';
import { Advices, Advicer } from '../advices/index';
import { isValideAspectTarget } from '../isValideAspectTarget';


export interface ExetndsInstanceActionData extends ActionData<AdviceMetadata> {

}

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
