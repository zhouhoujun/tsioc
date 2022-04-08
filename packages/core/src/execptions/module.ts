import { Module } from '../metadata/decor';
import { EXECPTION_PROVIDERS } from './providers';


@Module({
    providers: [
        ...EXECPTION_PROVIDERS
    ]
})
export class ExecptionModule {

}
