import {
    IContainer, ActionData, ClassMetadata,
    ActionComposite, hasOwnClassMetadata, getOwnTypeMetadata, isClass, symbols
} from '@tsioc/core';
import { IAdvisor } from '../IAdvisor';
import { AopActions } from './AopActions';


export interface RegistAspectActionData extends ActionData<ClassMetadata> {

}

export class RegistAspectAction extends ActionComposite {

    constructor() {
        super(AopActions.registAspect);
    }

    protected working(container: IContainer, data: RegistAspectActionData) {
        let type = data.targetType;
        let propertyKey = data.propertyKey;
        let lifeScope = container.getLifeScope();

        let matchs = lifeScope.getClassDecorators(surm => surm.actions.includes(AopActions.registAspect) && hasOwnClassMetadata(surm.name, type));
        let aspectMgr = container.get<IAdvisor>(symbols.IAdvisor);
        matchs.forEach(surm => {
            let metadata = getOwnTypeMetadata<ClassMetadata>(surm.name, type);
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
