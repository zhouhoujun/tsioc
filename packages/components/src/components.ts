import { Module } from '@tsdi/core';
import { ForDirective } from './directivies/for';
import { IfDirective } from './directivies/if';
import { TemplateOutletDirective } from './directivies/outlet';
import { Plural, PluralCase } from './directivies/plural';
import { DirSwitch, DirSwitchCase, DirSwitchDefault } from './directivies/switch';
import { AsyncPipe } from './pipes/async';
import { ComponentRunnableFactoryResolver } from './refs/component';
import { ComponentState } from './state';



/**
 * component extend module.
 *
 * @export
 * @class ComponentModule
 */
@Module({
    providers:[
        ComponentState,
        ComponentRunnableFactoryResolver
        // {provide: ComponentFactoryResolver, useClass: }
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
