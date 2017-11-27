import { ActionComposite, ActionType, ActionData } from '../actions';
import { DecoratorType } from '../decorators';
import { IContainer } from '../IContainer';
import { MethodMetadata } from '../metadatas';


export interface RunnerActionData extends ActionData<MethodMetadata> {
    condition?: string;
}


export class RunnerAction extends ActionComposite {

    constructor(decorName?: string, decorType?: DecoratorType) {
        super(ActionType.runner.toString(), decorName, decorType)
    }

    protected working(container: IContainer, data: RunnerActionData) {

    }
}
