import { IInjector, Injectable } from '@tsdi/ioc';
import { pipeExp } from './bindings/exps';
import { IPipeTransform } from './bindings/IPipeTransform';
import { ComponentProvider } from './ComponentProvider';

@Injectable()
export class AstResolver {

    constructor(protected provider: ComponentProvider) {
    }

    /**
     * resolve expression.
     *
     * @param {string} expression
     * @param {IInjector} [injector]
     * @param {*} [envOptions]
     * @returns {*}
     * @memberof AstResolver
     */
    resolve(expression: string, injector: IInjector, envOptions?: any): any {
        if (!expression) {
            return expression;
        }

        try {
            // xxx | pipename
            let pipeTransf: IPipeTransform;
            if (pipeExp.test(expression)) {
                let idex = expression.lastIndexOf(' | ');
                let pipename = expression.substring(idex + 3);
                if (pipename) {
                    pipeTransf = this.provider.getPipe(pipename, injector);
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
