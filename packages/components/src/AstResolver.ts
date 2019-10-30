import { Singleton, Inject } from '@tsdi/ioc';
import { ContainerToken, IContainer } from '@tsdi/core';
import { AstParserToken } from './AstParser';


declare let func1: any;

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
                let params = Object.keys(envOptions).join(',');
                // tslint:disable-next-line:no-eval
                eval(`function func1(${params}) {
                        return eval('${expression}');
                    }`);
                if (func1) {
                    return func1(...Object.values(envOptions));
                } else {
                    // tslint:disable-next-line:no-eval
                    let func = eval(`(${params}) => {
                    return eval('${expression}');
                }`
                    );
                    return func(...Object.values(envOptions));
                }


            } else {
                // tslint:disable-next-line:no-eval
                return eval(expression);
            }
        } catch (err) {
            return expression;
        }
    }
}
