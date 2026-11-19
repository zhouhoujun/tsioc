import { Injectable } from '@tsdi/ioc';
import { Bean, Configuration } from '@tsdi/core';

@Injectable()
export class PropertyBeanValue {}

@Configuration()
export class PropertyConfiguration {
    @Bean()
    value!: PropertyBeanValue;
}
