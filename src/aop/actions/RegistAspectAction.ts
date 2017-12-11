
import { DecoratorType, ActionData, ClassMetadata, ActionComposite, getTypeMetadata } from '../../core';
import { IContainer } from '../../IContainer';
import { AspectSet } from '../AspectSet';
import { isClass } from '../../utils';
import { AopActions } from './AopActions';


export interface RegistAspectActionData extends ActionData<ClassMetadata> {

}

export class RegistAspectAction extends ActionComposite {

    constructor() {
        super(AopActions.registAspect.toString());
    }

    protected working(container: IContainer, data: RegistAspectActionData) {
        let target = data.target
        let type = data.targetType;
        let propertyKey = data.propertyKey;
        let lifeScope = container.getLifeScope();

        let matchs = lifeScope.getClassDecorators(surm => surm.actions.includes(AopActions.registAspect) && Reflect.hasMetadata(surm.name, type));

        let aspects = container.get(AspectSet);
        matchs.forEach(surm => {
            let metadata = getTypeMetadata<ClassMetadata>(surm.name, type);
            if (Array.isArray(metadata) && metadata.length > 0) {
                metadata.forEach(meta => {
                    if (isClass(meta.type)) {
                        aspects.add(meta.type);
                    }
                });
            }
        });
    }
}
