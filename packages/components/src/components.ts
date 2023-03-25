import { Module } from '@tsdi/ioc';
import { ForDirective } from './directivies/for';
import { IfDirective } from './directivies/if';
import { TemplateOutletDirective } from './directivies/outlet';
import { Plural, PluralCase } from './directivies/plural';
import { DirSwitch, DirSwitchCase, DirSwitchDefault } from './directivies/switch';
import { AsyncPipe } from './pipes/async';
import { ComponentRunnableFactory } from './runnable';
import { ComponentState } from './state';



/**
 * components module.
 *
 * @export
 * @class ComponentsModule
 */
@Module({
    providers:[
        ComponentState,
        ComponentRunnableFactory
    ],
    exports:[
        DirSwitch,
        DirSwitchCase,
        DirSwitchDefault,
        ForDirective,
        IfDirective,
        TemplateOutletDirective,
        Plural,
        PluralCase,
        AsyncPipe
    ]
})
export class ComponentsModule {

}
