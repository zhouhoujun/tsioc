import { DecoratorType, ActionData, ClassMetadata, ActionComposite, hasClassMetadata, getTypeMetadata } from '../../core/index';
import { IContainer } from '../../IContainer';
import { IAspectManager } from '../IAspectManager';
import { isClass, symbols } from '../../utils/index';
import { AopActions } from './AopActions';


export interface RegistAspectActionData extends ActionData<ClassMetadata> {

}

export class RegistAspectAction extends ActionComposite {

    constructor() {
        super(AopActions.registAspect);
    }

    protected working(container: IContainer, data: RegistAspectActionData) {
        let target = data.target
        let type = data.targetType;
        let propertyKey = data.propertyKey;
        let lifeScope = container.getLifeScope();

        let matchs = lifeScope.getClassDecorators(surm => surm.actions.includes(AopActions.registAspect) && hasClassMetadata(surm.name, type));

        let aspectMgr = container.get<IAspectManager>(symbols.IAspectManager);
        matchs.forEach(surm => {
            let metadata = getTypeMetadata<ClassMetadata>(surm.name, type);
            if (Array.isArray(metadata) && metadata.length > 0) {
                metadata.forEach(meta => {
                    if (isClass(meta.type)) {
                        aspectMgr.add(meta.type);
                    }
                });
            }
        });
    }
}
