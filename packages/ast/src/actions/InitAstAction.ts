import { AST } from '../ast';
import { ActionComposite, IContainer, ActionData, hasClassMetadata, getTypeMetadata } from '@ts-ioc/core';
import { AstMetadata, Ast } from '../decorators/Ast';

/**
 * init ast action data.
 *
 * @export
 * @interface InitAstActionData
 * @extends {ActionData<AdviceMetadata>}
 */
export interface InitAstActionData extends ActionData<AstMetadata> {

}

/**
 * init ast action.
 *
 * @export
 * @class InitAstAction
 * @extends {ActionComposite}
 */
export class InitAstAction extends ActionComposite {

    constructor() {
        super('InitAstAction')
    }

    protected working(container: IContainer, data: InitAstActionData) {

        if (data.targetType && data.target && hasClassMetadata(Ast, data.targetType)) {
            let ast = data.target as AST;
            let metas = getTypeMetadata<AstMetadata>(Ast, data.targetType);
            if (metas.length) {
                ast.astType = metas[0].astType;
            }
        }
    }
}
