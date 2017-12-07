
import { DecoratorType, ActionData, ClassMetadata, ActionComposite } from '../../core';
import { IContainer } from '../../IContainer';
import { AspectSet } from '../AspectSet';
import { isClass } from '../../utils';
import { AopActions } from './AopActions';


export interface RegistAspectActionData extends ActionData<ClassMetadata> {

}

export class RegistAspectAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(AopActions.registAspect.toString(), decorName, decorType);
    }

    protected working(container: IContainer, data: RegistAspectActionData) {
        let metadata = data.metadata || [];
        let aspects = container.get(AspectSet);
        metadata.forEach(meta => {
            if (isClass(meta.type)) {
                aspects.add(meta.type);
            }
        });
    }
}
