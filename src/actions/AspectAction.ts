import { ClassMetadata } from '../metadatas/index';
import { ActionComposite } from './ActionComposite';
import { DecoratorType } from '../decorators';
import { ActionType } from './ActionType';
import { IContainer } from '../IContainer';
import { ActionData } from './ActionData';


export interface AspectActionData extends ActionData<ClassMetadata> {

}

export class AspectAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(ActionType.aspect.toString(), decorName, decorType);
    }

    protected working(container: IContainer, data: AspectActionData) {
        let metadata = data.metadata;
    }
}
