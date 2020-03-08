import { DIModule, ORMCoreModule } from '@tsdi/boot';
import { TypeOrmHelper } from './TypeOrmHelper';
import { TypeOrmModelParser } from './TypeOrmModelParser';
import { TypeormConnectionStatupService } from './TypeormConnectionStatupService';

@DIModule({
    regIn: 'root',
    imports: [
        ORMCoreModule
    ],
    providers: [
        TypeormConnectionStatupService,
        TypeOrmHelper,
        TypeOrmModelParser
    ]
})
export class TypeOrmModule {

}
