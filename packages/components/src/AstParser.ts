import { ObjectMap, InjectToken } from '@tsdi/ioc';

export interface Ast {
    execute(ctx: ObjectMap<any>);
}

export interface AstParser {
    parse(expression: string): Ast;
}

export const AstParserToken = new InjectToken<AstParser>('ast_parser');
