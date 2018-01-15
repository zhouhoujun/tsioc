import { DecoratorType, ActionData, ActionComposite, hasClassMetadata, getMethodMetadata } from '../../core/index';
import { IContainer } from '../../IContainer';
import { IAspectManager } from '../IAspectManager';
import { isClass, symbols, isProviderMap, isFunction } from '../../utils/index';
import { AopActions } from './AopActions';
import { Advice, Aspect } from '../decorators/index';
import { AdviceMetadata } from '../metadatas/index'
import { Token } from '../../types';
import { IAdviceMatcher } from '../IAdviceMatcher';
import { IMethodAccessor } from '../../IMethodAccessor';
import { Advices } from '../Advices';
import { Joinpoint, JoinpointState } from '../Joinpoint';
import { isValideAspectTarget } from '../isValideAspectTarget';
import { ProviderMap } from '../../ProviderMap';
import { Provider } from '../../Provider';


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
            if (isProviderMap(p)) {
                Object.values(p).forEach((pdr: Provider) => {
                    if (pdr &&  isFunction(pdr.extendsTarget)) {
                        pdr.extendsTarget(data.target);
                    }
                });
            } else {
                let pdr = p as Provider;
                if (pdr && isFunction(pdr.extendsTarget)) {
                    pdr.extendsTarget(data.target);
                }
            }
        })
    }
}
