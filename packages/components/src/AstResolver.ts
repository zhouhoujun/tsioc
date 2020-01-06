import { Singleton, Inject, INJECTOR, IInjector } from '@tsdi/ioc';
import { AstParserToken } from './AstParser';


@Singleton()
export class AstResolver {

    @Inject(INJECTOR) protected injector: IInjector;

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
    resolve(expression: string, envOptions?: any, injector?: IInjector): any {
        if (!expression) {
            return expression;
        }
        injector = injector || this.injector;
        if (injector.hasRegister(AstParserToken)) {
            return injector.get(AstParserToken).parse(expression).execute(envOptions);
        }

        try {
            if (envOptions) {
                // tslint:disable-next-line:no-eval
                let func = eval(`(${Object.keys(envOptions).join(',')}) => {
                    return ${expression};
                }`);
                return func(...Object.values(envOptions));
            } else {
                // tslint:disable-next-line:no-eval
                return eval(expression);
            }
        } catch (err) {
            return void 0;
        }
    }
}
