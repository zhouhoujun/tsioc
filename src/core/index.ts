import { IContainer } from '../IContainer';
import { symbols } from '../utils';
import { Injectable, AutoWired, Inject, Singleton, Param, Method } from './decorators';
import { CoreActions, ICoreActionBuilder, CoreActionBuilder } from './actions';


export * from './actions';
export * from './decorators';
export * from './metadatas';
export * from './factories';

export function registerCores(container: IContainer) {
    container.registerSingleton(symbols.ICoreActionBuilder, CoreActionBuilder);

    let builder = container.get<ICoreActionBuilder>(symbols.ICoreActionBuilder);
    container.registerDecorator(Injectable,
        builder.build(Injectable.toString(), container.getDecoratorType(Injectable),
            CoreActions.bindProvider));

    container.registerDecorator(AutoWired,
        builder.build(AutoWired.toString(), container.getDecoratorType(AutoWired),
            CoreActions.bindParameterType, CoreActions.bindPropertyType));

    container.registerDecorator(Inject,
        builder.build(Inject.toString(), container.getDecoratorType(Inject),
            CoreActions.bindParameterType, CoreActions.bindPropertyType));

    container.registerDecorator(Singleton,
        builder.build(Singleton.toString(), container.getDecoratorType(Singleton), CoreActions.bindProvider));

    container.registerDecorator(Param,
        builder.build(Param.toString(), container.getDecoratorType(Param),
            CoreActions.bindParameterType));

    container.registerDecorator(Method,
        builder.build(Method.toString(), container.getDecoratorType(Method),
            CoreActions.bindParameterProviders));

    container.register(Date);
    container.register(String);
    container.register(Number);
    container.register(Boolean);
    container.register(Object);
}
