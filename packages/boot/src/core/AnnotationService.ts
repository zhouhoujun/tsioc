import {
    Singleton, Inject, lang, DecoratorProvider, ClassType, DecoractorDescriptorToken, TypeReflects, Abstract
} from '@tsdi/ioc';
import { ModuleConfigure } from './modules';
import { AnnotationServiceToken, IAnnotationService } from './IAnnotationService';

@Abstract()
export abstract class AnnotationMerger<T extends ModuleConfigure = ModuleConfigure> {
    abstract merge(configs: T[]): T;
}

@Singleton(AnnotationServiceToken)
export class AnnotationService implements IAnnotationService {

    @Inject() reflects: TypeReflects;
    @Inject() decProvider: DecoratorProvider;


    getDecorator(type: ClassType) {
        let dec = this.reflects.getDecorators(type, 'class')
            .find(d => this.decProvider.has(d, DecoractorDescriptorToken) ? this.decProvider.resolve(d, DecoractorDescriptorToken).annoation : false);
        return dec;
    }

    getAnnoation(type: ClassType, decorator?: string): ModuleConfigure {
        if (!decorator) {
            decorator = this.getDecorator(type);
        }
        let annos = this.reflects.getMetadata<ModuleConfigure>(decorator, type);
        if (this.decProvider.has(decorator, AnnotationMerger)) {
            return this.decProvider.resolve(decorator, AnnotationMerger).merge(annos);
        } else {
           return { ...lang.first(annos) };
        }
    }
}
