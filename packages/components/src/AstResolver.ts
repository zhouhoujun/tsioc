import { Singleton, Inject, INJECTOR, IInjector } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { AstParserToken } from './AstParser';
import { pipeExp } from './bindings/exps';
import { IPipeTransform } from './bindings/IPipeTransform';
import { ComponentBuilderToken } from './IComponentBuilder';

@Singleton()
export class AstResolver {

    @Inject(INJECTOR) protected injector: ICoreInjector;

    constructor() {
    }

    /**ß
     * resolve expression.
     *
     * @param {string} expression
     * @param {*} [envOptions]
     * @param {IContainer} [container]
     * @returns {*}
     * @memberof AstResolver
     */
    resolve(expression: string, envOptions?: any, injector?: IInjector): any {
        if (!expression) {
            return expression;
        }
        injector = injector || this.injector;
        if (injector.hasRegister(AstParserToken)) {
            return injector.get(AstParserToken).parse(expression).execute(envOptions);
        }

        try {
            // xxx | pipename
            let pipeTransf: IPipeTransform;
            if (pipeExp.test(expression)) {
                let idex = expression.lastIndexOf(' | ');
                let pipename = expression.substring(idex + 3);
                if (pipename) {
                    pipeTransf = injector.get(ComponentBuilderToken).getPipe(pipename, injector);
                }
                expression = expression.substring(0, idex);
            }
            let value;
            if (envOptions) {
                // tslint:disable-next-line:no-eval
                let func = eval(`(${Object.keys(envOptions).join(',')}) => {
                    return ${expression};
                }`);
                value = func(...Object.values(envOptions));

            } else {
                // tslint:disable-next-line:no-eval
                value = eval(expression);
            }
            return pipeTransf ? pipeTransf.transform(value) : value;
        } catch (err) {
            return void 0;
        }
    }
}
