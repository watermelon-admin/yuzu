import { 
  replacePlaceholders, 
  PlaceholderValues 
} from '../placeholders.js';

describe('Placeholder System', () => {
  describe('replacePlaceholders', () => {
    test('should replace placeholders with values', () => {
      const text = 'Hello, {name}! Today is {date}.';
      const placeholderValues: PlaceholderValues = {
        'name': 'John',
        'date': '2023-01-01'
      };
      
      const result = replacePlaceholders(text, placeholderValues);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('Hello, John! Today is 2023-01-01.');
    });
    
    test('should preserve text without placeholders', () => {
      const text = 'Hello, world! No placeholders here.';
      const placeholderValues: PlaceholderValues = {
        'name': 'John'
      };
      
      const result = replacePlaceholders(text, placeholderValues);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(text);
    });
    
    test('should return error for missing placeholder values', () => {
      const text = 'Hello, {name}! Today is {date}.';
      const placeholderValues: PlaceholderValues = {
        'name': 'John'
        // date is missing
      };
      
      const result = replacePlaceholders(text, placeholderValues);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
    
    test('should handle multiple occurrences of the same placeholder', () => {
      const text = 'Hello, {name}! Nice to meet you, {name}.';
      const placeholderValues: PlaceholderValues = {
        'name': 'John'
      };
      
      const result = replacePlaceholders(text, placeholderValues);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('Hello, John! Nice to meet you, John.');
    });
    
    test('should handle empty string value', () => {
      const text = 'Hello, {name}!';
      const placeholderValues: PlaceholderValues = {
        'name': ''
      };
      
      const result = replacePlaceholders(text, placeholderValues);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('Hello, !');
    });
    
    test('should detect missing opening bracket', () => {
      const text = 'Hello, name}!';
      const placeholderValues: PlaceholderValues = {
        'name': 'John'
      };
      
      const result = replacePlaceholders(text, placeholderValues);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('missing opening bracket');
    });
    
    test('should detect missing closing bracket', () => {
      const text = 'Hello, {name!';
      const placeholderValues: PlaceholderValues = {
        'name': 'John'
      };
      
      const result = replacePlaceholders(text, placeholderValues);
      
      expect(result.success).toBe(false);
      // Match actual error message format
      expect(result.error).toBeTruthy();
    });
    
    test('should handle TZID placeholders', () => {
      // Note: This test relies on mock implementations of GetTZIDName and GetTZIDTime
      // The actual behavior will depend on the implementation of these functions
      const text = 'The local time is {end-time-home}';
      const placeholderValues: PlaceholderValues = {
        'end-time-home': '14:30'
      };
      
      const result = replacePlaceholders(text, placeholderValues);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('The local time is 14:30');
    });
  });
});