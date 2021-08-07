import { AnnotationReflect, RunnableFactoryResolver, Runner } from '@tsdi/boot';
import { CompilerFacade } from '@tsdi/components';
import { ClassType, createDecorator, InjectableMetadata } from '@tsdi/ioc';
import { ActivityMetadata, WorkflowMetadata } from './meta';


/**
 * Activity decorator
 *
 * @export
 * @interface IActivityDecorator
 */
 export interface IActivityDecorator {
    /**
     * Workflow decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`WorkflowLifecycle`]
     *
     * @Workflow
     *
     * @param {ActivityMetadata} [metadata] metadata map.
     */
    (metadata?: ActivityMetadata): ClassDecorator;

    /**
     * Workflow decorator, use to define class as Workflow element.
     *
     * @Task
     * @param {string} selector metadata selector.
     */
    (selector: string, option?: InjectableMetadata): ClassDecorator;
}

/**
 * Activity decorator, define for class. use to define the class as Activity.
 *
 * @Activity
 */
export const Activity: IActivityDecorator = createDecorator<ActivityMetadata>('Activity', {
    actionType: ['annoation', 'typeProviders'],
    props: (selector: string, option?: InjectableMetadata) => ({ selector, ...option }),
    reflect: {
        class: (ctx, next) => {
            (ctx.reflect as AnnotationReflect).annoType = 'activity';
            (ctx.reflect as AnnotationReflect).annoDecor = ctx.decor;
            (ctx.reflect as AnnotationReflect).annotation = ctx.metadata;
            return next();
        }
    },
    design: {
        class: (ctx, next) => {
            if ((ctx.reflect as ActivityReflect).annoType !== 'activity') {
                return next();
            }

            if (ctx.reflect.class.annotation?.def) {
                (ctx.reflect as ActivityReflect).def = ctx.reflect.class.annotation?.def;
                return next();
            }

            const compiler = ctx.injector.getService({ token: CompilerFacade, target: ctx.currDecor });
            (ctx.reflect as ActivityReflect).def = compiler.compileActivity((ctx.reflect as ActivityReflect));

            next();
        }
    }
});



/**
 * Workflow decorator
 *
 * @export
 * @interface IWorkflowDecorator
 */
 export interface IWorkflowDecorator {
    /**
     * Workflow decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`WorkflowLifecycle`]
     *
     * @Workflow
     *
     * @param {WorkflowMetadata} [metadata] metadata map.
     */
    (metadata: WorkflowMetadata): ClassDecorator;

    /**
     * Workflow decorator, use to define class as Workflow element.
     *
     * @Task
     * @param {string} selector metadata selector.
     */
    (selector?: string, template?: any, option?: InjectableMetadata): ClassDecorator;
}

/**
 * Workflow decorator, define for class. use to define the class as Workflow. it can setting provider to some token, singleton or not. it will execute  [`WorkflowLifecycle`]
 *
 * @Workflow
 */
export const Workflow: IWorkflowDecorator = createDecorator<WorkflowMetadata>('Workflow', {
    actionType: ['annoation', 'typeProviders'],
    props: (selector: string, template?: any, option?: InjectableMetadata) => ({ selector, template, ...option }),
    reflect: {
        class: (ctx, next) => {
            (ctx.reflect as AnnotationReflect).annoType = 'workflow';
            (ctx.reflect as AnnotationReflect).annoDecor = ctx.decor;
            (ctx.reflect as AnnotationReflect).annotation = ctx.metadata;
            return next();
        }
    },
    design: {
        class: (ctx, next) => {
            const compRefl = ctx.reflect as WorkflowReflect;
            if (compRefl.annoType !== 'workflow') {
                return next();
            }

            if (ctx.reflect.class.annotation?.def) {
                (ctx.reflect as WorkflowReflect).def = ctx.reflect.class.annotation?.def;
                return next();
            }

            const compiler = ctx.injector.getService({ token: CompilerFacade, target: ctx.currDecor });
            compRefl.def = compiler.compileWorkflow(compRefl);
            next();
        }
    },
    providers: [
        { provide: RunnableFactoryResolver, useExisting: WorkflowFactoryResolver }
    ]
});


/**
 * task decorator, use to define class is a task element.
 *
 * @export
 * @interface TaskDecorator
 * @template T
 */
export interface TaskDecorator {
    /**
     * Activity decorator, use to define class as Activity element.
     *
     * @Task
     *
     * @param {ActivityMetadata} [metadata] Activity metadate configure.
     */
    (metadata?: ActivityMetadata): ClassDecorator;

    /**
     * Activity decorator, use to define class as Activity element.
     *
     * @Task
     * @param {string} selector metadata selector.
     */
    (selector: string): ClassDecorator;

    /**
     * task decorator, use to define class as task element.
     *
     * @Task
     */
    (target: ClassType): void;
}


/**
 * task decorator, use to define class is a task element.
 *
 * @Task
 */
export const Task: TaskDecorator = createDecorator<ActivityMetadata>('Task', {
    actionType: 'annoation',
    props: (selector: string) => ({ selector }) as ActivityMetadata,
    reflect: {
        class: (ctx, next) => {
            const reflect = ctx.reflect as AnnotationReflect;
            reflect.annoType = 'component';
            reflect.annoDecor = ctx.decor;
            const metadata = ctx.metadata as ActivityMetadata;
            if (!metadata.name) {
                metadata.name = ctx.reflect.class.className;
            }
            reflect.annotation = ctx.metadata;
            return next();
        }
    },
    design: {
        class: (ctx, next) => {
            const relt = ctx.reflect as AnnotationReflect;
            const annoation = relt.annotation as ActivityMetadata;
            if (annoation.deps && annoation.deps.length) {
                ctx.injector.register(annoation.deps);
            }
            next();
        }
    },
    providers: [
        { provide: Runner, useClass: WorkflowContext }
    ]
}) as TaskDecorator;

