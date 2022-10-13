import { BootstrapOption, RunnableFactory } from '@tsdi/core';
import { Injectable, Injector, Type, TypeDef } from '@tsdi/ioc';


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
    run<T>(target: Type<T> | TypeDef<T>, option?: BootstrapOption): any {
        const factory = this.injector.resolve({ token: RunnableFactory, target });
        return factory.create(target, this.injector, option).run()
    }
}