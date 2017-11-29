import { ClassMetadata } from '../metadatas/index';
import { ActionComposite } from './ActionComposite';
import { DecoratorType } from '../decorators';
import { ActionType } from './ActionType';
import { IContainer } from '../IContainer';
import { ActionData } from './ActionData';
import { AspectSet } from '../aop/AspectSet';
import { isClass } from '../utils';


export interface AspectActionData extends ActionData<ClassMetadata> {

}

export class AspectAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(ActionType.aspect.toString(), decorName, decorType);
    }

    protected working(container: IContainer, data: AspectActionData) {
        let metadata = data.metadata;
        let aspects = container.get(AspectSet);
        metadata.forEach(meta => {
            if (isClass(meta.type)) {
                aspects.add(meta.type);
            }
        });
    }
}
