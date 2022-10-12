import { ApplicationContext, BootstrapOption, RunnableFactory } from "@tsdi/core";
import { Injectable, Injector, Type } from "@tsdi/ioc";


@Injectable()
export class WorkflowService {

    constructor(private injector: Injector) {

    }

    /**
     * run activity.
     *
     * @template T
     * @param {(Type<T> | RunnableFactory<T> )} target
     * @param option bootstrap option, instance of {@link BootstrapOption}
     * @returns {*}
     */
    run<T>(target: Type<T> | RunnableFactory<T>, option?: BootstrapOption): any {
        return this.injector.get(ApplicationContext).bootstrap(target, option);
    }
}