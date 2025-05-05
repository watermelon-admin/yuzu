namespace Yuzu.Web.Settings {
    /**
     * Type definitions for jQuery and Bootstrap
     * Used internally within the Yuzu.Web.Settings namespace
     */
    
    // jQuery interface used within our code
    export interface IJQuery {
        // Validation methods
        validate?: () => any;
        valid?: () => boolean;
        
        // Data methods
        data(key: string, value: any): IJQuery;
        data(key: string): any;
        
        // DOM manipulation methods
        attr(attributeName: string, value: string): IJQuery;
        attr(attributeName: string): string;
        find(selector: string): IJQuery;
        closest(selector: string): IJQuery;
        text(text: string): IJQuery;
        text(): string;
        addClass(className: string): IJQuery;
        removeClass(className: string): IJQuery;
        append(element: IJQuery | Element | string): IJQuery;
        val(value: string | number): IJQuery;
        val(): string;
    }

    // Bootstrap modal interface used within our code
    export interface IBootstrapModal {
        show(): void;
        hide(): void;
    }

    export interface IBootstrapStatic {
        Modal: {
            new(element: HTMLElement, options?: any): IBootstrapModal;
            getInstance(element: HTMLElement): IBootstrapModal | null;
        };
        Tooltip: {
            new(element: Element, options?: any): any;
        };
    }

    // jQuery factory function type
    export type IJQueryFactory = (selector: string | HTMLElement | Document) => IJQuery;
}