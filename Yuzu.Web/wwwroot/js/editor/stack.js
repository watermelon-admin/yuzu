/**
 * Module: Stack
 * A generic stack data structure implementation
 */
export { Stack };
class Stack {
    /**
     * Creates a new instance of the Stack class.
     */
    constructor() {
        this.items = [];
    }
    /**
     * Adds an item to the top of the stack.
     * @param item The item to push onto the stack.
     */
    push(item) {
        this.items.push(item);
        //this.dump();
    }
    /**
     * Removes and returns the item at the top of the stack.
     * @returns The item removed from the top of the stack, or undefined if the stack is empty.
     */
    pop() {
        let result = this.items.pop();
        //this.dump();
        return result;
    }
    /**
     * Returns the item at the top of the stack without removing it.
     * @returns The item at the top of the stack, or undefined if the stack is empty.
     */
    peek() {
        return this.items[this.items.length - 1];
    }
    /**
     * Checks if the stack is empty.
     * @returns True if the stack is empty, otherwise false.
     */
    isEmpty() {
        return this.items.length === 0;
    }
    /**
     * Returns the number of items in the stack.
     * @returns The number of items in the stack.
     */
    size() {
        return this.items.length;
    }
    /**
     * Removes all items from the stack.
     */
    clear() {
        this.items = [];
    }
    /**
    * Dumps the content of the stack as a table to the console.
    */
    dump() {
        console.table(this.items.map((item, index) => ({ Index: index, Item: item })));
    }
}
//# sourceMappingURL=stack.js.map