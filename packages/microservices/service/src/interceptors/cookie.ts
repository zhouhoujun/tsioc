export abstract class CookieInterceptor {
    abstract intercept(input: any, next: any, context: any): any;
}
