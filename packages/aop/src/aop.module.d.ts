import { Injector } from '@tsdi/ioc';
export declare class AopProvider {
    /**
     * register aop for container.
     */
    setup(injector: Injector): void;
}
/**
 * aop ext for ioc. auto run setup after registered.
 * @export
 * @class AopModule
 */
export declare class AopModule {
}
export declare function provideAop(): {
    providers: (typeof AopProvider)[];
};
