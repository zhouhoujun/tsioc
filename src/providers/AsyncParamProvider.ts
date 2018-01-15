import { ParamProvider } from './ParamProvider';
import { ToInstance, Token, Providers } from '../types';
import { IContainer } from '../IContainer';
import { IContainerBuilder } from '../IContainerBuilder';
import { symbols } from '../utils/index';

/**
 * async param provider.
 * async load source file and execution as param value.
 *
 * @export
 * @interface AsyncParamProvider
 * @extends {ParamProvider}
 */
export class AsyncParamProvider extends ParamProvider {
    /**
     * match ref files.
     *
     * @type {(string | string[])}
     * @memberof AsyncParamProvider
     */
    protected files?: string | string[];

    constructor(files: string | string[], index?: number | string, value?: any | ToInstance<any>, type?: Token<any>, method?: string) {
        super(index, value, type, method);
        this.files = files;
    }

    resolve(container: IContainer, ...providers: Providers[]): any {
        let buider = container.get<IContainerBuilder>(symbols.IContainerBuilder);
        return buider.loadModule(container, {
            files: this.files
        })
            .then(() => {
                return super.resolve(container, ...providers);
            });
    }

}
