import { DecoratorType, ActionData, ActionComposite, ExtendsProvider } from '../../core/index';
import { IContainer } from '../../IContainer';
import { symbols, isFunction } from '../../utils/index';
import { AopActions } from './AopActions';
import { Advice, Aspect } from '../decorators/index';
import { AdviceMetadata } from '../metadatas/index'
import { Token } from '../../types';
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';
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
