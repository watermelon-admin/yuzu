# AJAX in ASP.NET Core Razor Pages - Best Practices

This guide covers the correct way to implement AJAX calls in ASP.NET Core Razor Pages.

## Table of Contents

1. [Server-Side Setup](#server-side-setup)
2. [Client-Side Implementation](#client-side-implementation)
3. [Anti-Forgery Token Handling](#anti-forgery-token-handling)
4. [Debugging Tips](#debugging-tips)
5. [Common Issues](#common-issues)

## Server-Side Setup

### Handler Method Naming

Handler methods in Razor Pages follow a specific naming convention:

```csharp
// For GET requests
public async Task<IActionResult> OnGetHandlerName() { ... }

// For POST requests 
public async Task<IActionResult> OnPostHandlerName() { ... }
```

When making AJAX calls, you use `?handler=HandlerName` in the URL (omitting the `OnGet` or `OnPost` prefix).

### JSON Request Handling

To accept JSON data in a POST request:

```csharp
[ValidateAntiForgeryToken] // Security measure
public async Task<IActionResult> OnPostUpdateName([FromBody] UpdateNameRequest request)
{
    return await this.SafeExecuteAsync(async () =>
    {
        // Process request...
        
        // Return JSON response
        return new JsonResult(new { 
            success = true, 
            message = "Operation successful", 
            data = new { /* data to return */ } 
        });
    });
}
```

### Model Class for Request Data

Create a model class for the incoming JSON data:

```csharp
public class UpdateNameRequest
{
    [StringLength(50, ErrorMessage = "First name cannot exceed {1} characters.")]
    [JsonPropertyName("FirstName")] // Must match property name in JSON
    public string FirstName { get; set; } = string.Empty;
    
    [StringLength(50, ErrorMessage = "Last name cannot exceed {1} characters.")]
    [JsonPropertyName("LastName")]
    public string LastName { get; set; } = string.Empty;
}
```

### Response Formatting

For consistent response handling:

```csharp
// Standard response helper in ErrorHandling.cs
public static JsonResult JsonSuccess(string message, object? data = null)
{
    return new JsonResult(new SuccessResponse 
    { 
        Success = true, 
        Message = message,
        Data = data
    });
}

public static JsonResult JsonError(string message, int statusCode = StatusCodes.Status400BadRequest, object? errors = null)
{
    return new JsonResult(new ErrorResponse { 
        Success = false, 
        Message = message,
        Errors = errors
    }) 
    { 
        StatusCode = statusCode 
    };
}
```

## Client-Side Implementation

### Basic AJAX Call Structure in TypeScript

```typescript
async function sendAjaxRequest(): Promise<void> {
    try {
        // Get anti-forgery token
        const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
        if (!tokenInput || !tokenInput.value) {
            throw new Error('Anti-forgery token not found');
        }
        const token = tokenInput.value;
        
        // Create request payload
        const payload = {
            FirstName: "John",  // Note the capitalization matches C# model
            LastName: "Doe"
        };
        
        // Send request
        const url = document.location.pathname + '?handler=UpdateName';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify(payload),
            credentials: 'same-origin'
        });
        
        // Process response
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
            // Handle success
            console.log('Success:', data.message);
        } else {
            // Handle error
            console.error('Error:', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
```

### Response Interface

```typescript
interface AjaxResponse {
    success: boolean;
    message: string;
    data?: any;
    errors?: any;
}
```

## Anti-Forgery Token Handling

### Server-Side Setup

Apply the `ValidateAntiForgeryToken` attribute to protect endpoints:

```csharp
[ValidateAntiForgeryToken]
public async Task<IActionResult> OnPostUpdateName([FromBody] UpdateNameRequest request)
{
    // Handler code...
}
```

You can also apply it at the page level to protect all handlers:

```csharp
[ValidateAntiForgeryToken]
public class MyPageModel : PageModel
{
    // Page model code...
}
```

### Client-Side Token Access

The token is automatically included in the page by ASP.NET Core in a hidden field:

```html
<input name="__RequestVerificationToken" type="hidden" value="CfDJ8PGO6iRrYExHk..." />
```

Access it in JavaScript/TypeScript:

```typescript
const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
const token = tokenInput.value;
```

### Sending the Token with Requests

The token must be sent in the `RequestVerificationToken` header:

```typescript
fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'RequestVerificationToken': token
    },
    // Other options...
});
```

## Debugging Tips

### Server-Side Logging

Add detailed logging to trace request handling:

```csharp
_logger.LogInformation("Request path: {Path}", Request.Path);
_logger.LogInformation("Request method: {Method}", Request.Method);
_logger.LogInformation("Content type: {ContentType}", Request.ContentType);
_logger.LogInformation("Headers: {Headers}", string.Join(", ", 
    Request.Headers.Select(h => $"{h.Key}={string.Join(",", h.Value.ToArray())}")));
```

### Client-Side Debugging

Log request details and raw response data:

```typescript
console.log('Sending request to:', url);
console.log('Request headers:', headers);
console.log('Request payload:', payload);

// After receiving response
console.log('Response status:', response.status);
const responseText = await response.text();
console.log('Raw response:', responseText);

// Try parsing as JSON
try {
    const data = JSON.parse(responseText);
    console.log('Parsed response:', data);
} catch (e) {
    console.error('Failed to parse response as JSON:', e);
}
```

## Common Issues

### Route Not Found (404)

- **Cause**: Incorrect handler name or URL format
- **Solution**: Use `?handler=HandlerName` where `HandlerName` matches the method name without the `OnPost` prefix
- **Example**: For `OnPostUpdateName`, use `/MyPage?handler=UpdateName`

### Unauthorized (401) or Forbidden (403)

- **Cause**: Missing or invalid anti-forgery token
- **Solution**: Ensure token is retrieved correctly and sent in the `RequestVerificationToken` header
- **Example**: `headers['RequestVerificationToken'] = token;`

### Bad Request (400)

- **Cause**: Usually a model binding or validation issue
- **Solutions**:
  1. Check property names in JSON match C# model property names (case-sensitive)
  2. Check that required fields are included
  3. Check data types match (e.g., strings for strings, numbers for numbers)
  
## Diagnosing Anti-Forgery Token Issues

If you're having issues with anti-forgery token validation, try these steps:

### 1. Test with an Endpoint that Ignores Anti-Forgery Validation

Create a test endpoint with the `[IgnoreAntiforgeryToken]` attribute to isolate the issue:

```csharp
// This handler explicitly doesn't validate antiforgery tokens
[IgnoreAntiforgeryToken]
public IActionResult OnPostTestEndpoint([FromBody] TestRequest request)
{
    // Log request details
    _logger.LogInformation("Test endpoint called");
    _logger.LogInformation("Headers: {Headers}", string.Join(", ", 
        Request.Headers.Select(h => $"{h.Key}={string.Join(",", h.Value.ToArray())}")));
    
    // Return success
    return new JsonResult(new { 
        success = true, 
        message = "Test successful", 
        data = request 
    });
}
```

### 2. Check if the Problem is with Model Binding

If the test endpoint works but your real endpoint doesn't, check these things:

- Make sure you're using `[FromBody]` attribute on your handler parameter
- Make sure the property names in your JSON match the C# model (case matters!)
- Add explicit `[JsonPropertyName("name")]` attributes to your model class

### 3. Debug Anti-Forgery Token Handling

- The token is automatically added to forms with `@Html.AntiForgeryToken()`
- In JavaScript, get the token like this:
  ```javascript
  const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
  const token = tokenInput.value;
  ```
- Send it in the header:
  ```javascript
  headers['RequestVerificationToken'] = token
  ```
- Make sure the cookie is also sent by using `credentials: 'same-origin'`

### HTML Response Instead of JSON

- **Cause**: ASP.NET Core is returning the page instead of handling the AJAX request
- **Solutions**:
  1. Add `X-Requested-With: XMLHttpRequest` header
  2. Add `Accept: application/json` header
  3. Check handler method exists and is accessible

### Content Type Issues

- **Cause**: Missing or incorrect Content-Type header
- **Solution**: Use `'Content-Type': 'application/json'` for JSON requests
- **Example**: `headers['Content-Type'] = 'application/json';`

## Complete Example

### C# Handler Method

```csharp
[ValidateAntiForgeryToken]
public async Task<IActionResult> OnPostUpdateName([FromBody] UpdateNameRequest request)
{
    return await this.SafeExecuteAsync(async () =>
    {
        // Validate request
        if (request == null)
        {
            return ErrorHandling.JsonError("Request body is required", StatusCodes.Status400BadRequest);
        }
        
        // Process request
        var userId = _userManager.GetUserId(User);
        if (userId == null)
        {
            return ErrorHandling.JsonError("User is not authenticated", StatusCodes.Status401Unauthorized);
        }
        
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return ErrorHandling.JsonError("User not found", StatusCodes.Status404NotFound);
        }
        
        // Update user data
        bool hasChanges = false;
        if (user.FirstName != request.FirstName)
        {
            user.FirstName = request.FirstName ?? string.Empty;
            hasChanges = true;
        }
        
        if (user.LastName != request.LastName)
        {
            user.LastName = request.LastName ?? string.Empty;
            hasChanges = true;
        }
        
        // Save changes if needed
        if (hasChanges)
        {
            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var errors = result.Errors.ToDictionary(e => e.Code, e => e.Description);
                return ErrorHandling.JsonError("Failed to update profile", StatusCodes.Status500InternalServerError, errors);
            }
        }
        
        // Return success response
        return ErrorHandling.JsonSuccess("Your profile has been updated", new 
        { 
            firstName = user.FirstName,
            lastName = user.LastName
        });
    });
}
```

### TypeScript AJAX Function

```typescript
async function updateUserName(firstName: string, lastName: string): Promise<void> {
    try {
        // Get form values
        if (firstName.length > 50) {
            showError('First name cannot exceed 50 characters');
            return;
        }
        
        if (lastName.length > 50) {
            showError('Last name cannot exceed 50 characters');
            return;
        }
        
        // Get anti-forgery token
        const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
        if (!tokenInput || !tokenInput.value) {
            throw new Error('Anti-forgery token not found');
        }
        const token = tokenInput.value;
        
        // Create request payload
        const payload = {
            FirstName: firstName,
            LastName: lastName
        };
        
        // Setup button loading state
        const updateButton = document.getElementById('settings_name_update') as HTMLButtonElement;
        if (updateButton) {
            updateButton.disabled = true;
            updateButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Updating...';
        }
        
        // Send request
        const url = document.location.pathname + '?handler=UpdateName';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify(payload),
            credentials: 'same-origin'
        });
        
        // Process response
        const data = await response.json();
        
        if (data.success) {
            showSuccess(data.message);
            
            // Update UI with returned values
            if (data.data) {
                const firstNameInput = document.getElementById('settings_firstname') as HTMLInputElement;
                const lastNameInput = document.getElementById('settings_lastname') as HTMLInputElement;
                
                if (firstNameInput) firstNameInput.value = data.data.firstName || '';
                if (lastNameInput) lastNameInput.value = data.data.lastName || '';
            }
        } else {
            showError(data.message || 'Failed to update profile');
            
            // Show field-specific errors
            if (data.errors) {
                if (data.errors.firstName) {
                    const firstNameError = document.getElementById('settings_firstname_error');
                    if (firstNameError) {
                        firstNameError.textContent = Array.isArray(data.errors.firstName) 
                            ? data.errors.firstName[0] 
                            : data.errors.firstName;
                    }
                }
                
                if (data.errors.lastName) {
                    const lastNameError = document.getElementById('settings_lastname_error');
                    if (lastNameError) {
                        lastNameError.textContent = Array.isArray(data.errors.lastName) 
                            ? data.errors.lastName[0] 
                            : data.errors.lastName;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error updating name:', error);
        showError('An error occurred while updating your profile.');
    } finally {
        // Reset button state
        const updateButton = document.getElementById('settings_name_update') as HTMLButtonElement;
        if (updateButton) {
            updateButton.disabled = false;
            updateButton.innerHTML = 'Update';
        }
    }
}

// Helper functions
function showSuccess(message: string): void {
    // Implement your toast or notification logic
}

function showError(message: string): void {
    // Implement your toast or notification logic
}
```

This guide should help you implement AJAX in ASP.NET Core Razor Pages correctly and avoid common pitfalls.