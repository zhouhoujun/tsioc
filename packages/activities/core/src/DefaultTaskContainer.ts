import { Type, hasClassMetadata, lang, IContainer, LoadType, isToken, Token, Factory } from '@ts-ioc/core';
import { SequenceConfigure, Active, IActivityRunner, UUIDToken, RandomUUIDFactory, ActivityRunnerToken, ActivityBuilderToken } from './core';
import { ITaskContainer } from './ITaskContainer';
import { IApplicationBuilder, DefaultApplicationBuilder, AppConfigure, DefaultAnnotationBuilderToken, DefaultServiceToken, DefaultModuleBuilderToken, ApplicationEvents } from '@ts-ioc/bootstrap';
import { Aspect, AopModule } from '@ts-ioc/aop';
import { SequenceActivity } from './activities';
import { CoreModule } from './CoreModule';
import { LogModule } from '@ts-ioc/logs';
import { WorkflowBuilderToken, WorkflowModuleInjectorToken, WorkflowModuleValidate, WorkflowModuleInjector } from './injectors';


/**
 * default task container.
 *
 * @export
 * @class DefaultTaskContainer
 */
export class DefaultTaskContainer implements ITaskContainer {

    constructor(public baseURL: string) {
    }

    protected container: IContainer;
    getContainer(): IContainer {
        if (!this.container) {
            this.container = this.getBuilder().getPools().getDefault();
        }
        return this.container;
    }


    protected builder: IApplicationBuilder<any>;
    getBuilder(): IApplicationBuilder<any> {
        if (!this.builder) {
            this.builder = this.createAppBuilder();
            this.builder.on(ApplicationEvents.onRootContainerCreated, (container: IContainer) => {
                container.register(WorkflowModuleValidate)
                    .register(WorkflowModuleInjector);
                let chain = container.getBuilder().getInjectorChain(container);
                chain.first(container.resolve(WorkflowModuleInjectorToken));

            })
            this.builder
                .use(AopModule)
                .use(LogModule)
                .use(CoreModule)
                .provider(DefaultAnnotationBuilderToken, ActivityBuilderToken)
                .provider(DefaultServiceToken, ActivityRunnerToken)
                .provider(DefaultModuleBuilderToken, WorkflowBuilderToken);

        }
        return this.builder;
    }

    protected createAppBuilder(): IApplicationBuilder<any> {
        return new DefaultApplicationBuilder(this.baseURL);
    }

    /**
     * use custom configuration.
     *
     * @param {(string | AppConfiguration)} [config]
     * @param {IContainer} [container]
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    useConfiguration(config?: string | AppConfigure): this {
        this.getBuilder().useConfiguration(config);
        return this;
    }

    /**
     * use module
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof IApplicationBuilder
     */
    use(...modules: LoadType[]): this {
        this.getBuilder().use(...modules);
        return this;
    }

    /**
     * bind provider
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Token<T> | Factory<T>} provider
     * @returns {this}
     * @memberof IContainer
     */
    provider(provide: Token<any>, provider: Token<any> | Factory<any>): this {
        this.getBuilder().provider(provide, provider);
        return this;
    }

    useLog(logAspect: Type<any>): this {
        if (hasClassMetadata(Aspect, logAspect)) {
            this.getBuilder().use(logAspect);
        } else {
            console.error('logAspect param is not right aspect');
        }
        return this;
    }

    getWorkflow<T>(workflowId: string): IActivityRunner<T> {
        return this.getContainer().resolve(workflowId);
    }

    /**
     * create workflow.
     *
     * @param {Active} activity
     * @param {string} [workflowId]
     * @memberof ITaskContainer
     */
    async createActivity(activity: Active, workflowId?: string): Promise<IActivityRunner<any>> {
        let boot: Active;
        workflowId = workflowId || this.createUUID();

        if (isToken(activity)) {
            boot = activity;
        } else {
            boot = activity || {};
            boot.id = workflowId;
            if (!boot.token) {
                boot.builder = boot.builder || WorkflowBuilderToken;
                boot.annotationBuilder = boot.annotationBuilder || ActivityBuilderToken;
            }
        }
        let env = this.getBuilder().getPools().create();
        let runner = await this.getBuilder().bootstrap(boot, env, workflowId) as IActivityRunner<any>;
        this.getContainer().bindProvider(workflowId, runner);
        return runner;
    }

    protected createUUID() {
        let container = this.getContainer()
        if (!container.has(UUIDToken)) {
            container.register(RandomUUIDFactory);
        }
        return container.get(UUIDToken).generate();
    }

    /**
     * create workflow and bootstrap.
     *
     * @param {...Active[]} activites
     * @returns {Promise<IActivityRunner<any>>}
     * @memberof DefaultTaskContainer
     */
    async bootstrap(...activites: Active[]): Promise<IActivityRunner<any>> {
        let workflow = (activites.length > 1) ? <SequenceConfigure>{ sequence: activites, activity: SequenceActivity } : lang.first(activites);
        let runner = await this.createActivity(workflow);
        return runner;
    }

    /**
     * run task.
     *
     * @param {...Active[]} activites
     * @returns {Promise<IActivityRunner<any>>}
     * @memberof DefaultTaskContainer
     */
    run(...activites: Active[]): Promise<IActivityRunner<any>> {
        return this.bootstrap(...activites);
    }

}

