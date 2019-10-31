import { Singleton, Inject, isNodejsEnv } from '@tsdi/ioc';
import { ContainerToken, IContainer } from '@tsdi/core';
import { AstParserToken } from './AstParser';

declare let __dy_eval_func: any;

@Singleton()
export class AstResolver {

    @Inject(ContainerToken) protected container;

    constructor() {
    }

    /**
     * resolve expression.
     *
     * @param {string} expression
     * @param {*} [envOptions]
     * @param {IContainer} [container]
     * @returns {*}
     * @memberof AstResolver
     */
    resolve(expression: string, envOptions?: any, container?: IContainer): any {
        if (!expression) {
            return expression;
        }
        container = container || this.container;
        if (container.has(AstParserToken)) {
            return container.get(AstParserToken).parse(expression).execute(envOptions);
        }

        try {
            if (envOptions) {
                // tslint:disable-next-line:no-eval
                let func = eval(`(${Object.keys(envOptions).join(',')}) => {
                    return eval('${expression}');
                }`
                );
                return func(...Object.values(envOptions));
            } else {
                // tslint:disable-next-line:no-eval
                return eval(expression);
            }
        } catch (err) {
            return expression;
        }
    }
}
