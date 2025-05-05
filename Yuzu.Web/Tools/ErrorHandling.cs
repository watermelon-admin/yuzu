using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net;

namespace Yuzu.Web.Tools
{
    /// <summary>
    /// Provides standardized error handling and response utilities for the application.
    /// </summary>
    public static class ErrorHandling
    {
        /// <summary>
        /// Creates a standardized JSON error response.
        /// </summary>
        /// <param name="message">The error message.</param>
        /// <param name="statusCode">The HTTP status code to return.</param>
        /// <param name="errors">Additional error details if available.</param>
        /// <returns>A JsonResult with standardized error format.</returns>
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
        
        /// <summary>
        /// Creates a standardized JSON error response for model validation errors.
        /// </summary>
        /// <param name="modelState">The ModelStateDictionary containing validation errors.</param>
        /// <param name="message">The error message.</param>
        /// <returns>A JsonResult with standardized error format including validation details.</returns>
        public static JsonResult ValidationError(ModelStateDictionary modelState, string message = "The form data is invalid")
        {
            return new JsonResult(new ErrorResponse { 
                Success = false, 
                Message = message,
                Errors = modelState
            }) 
            { 
                StatusCode = StatusCodes.Status400BadRequest 
            };
        }

        /// <summary>
        /// Creates a standardized JSON success response.
        /// </summary>
        /// <param name="message">The success message.</param>
        /// <param name="data">Optional data to include in the response.</param>
        /// <returns>A JsonResult with standardized success format.</returns>
        public static JsonResult JsonSuccess(string message, object? data = null)
        {
            return new JsonResult(new SuccessResponse 
            { 
                Success = true, 
                Message = message,
                Data = data
            });
        }
        
        /// <summary>
        /// Creates a customized JSON success response that matches exactly what the client expects.
        /// Use this method when you need to maintain backward compatibility with existing client code.
        /// </summary>
        /// <param name="responseObject">The complete response object to return to the client.</param>
        /// <returns>A JsonResult containing the exact response object.</returns>
        public static JsonResult JsonCustomResponse(object responseObject)
        {
            // With anonymous objects, we can't modify them after creation
            // Just return the responseObject directly, ensuring it has a success property
            // This is handled by passing in success = true when creating the anonymous object
            return new JsonResult(responseObject);
        }

        /// <summary>
        /// Extension method for PageModel to handle exceptions in a standardized way.
        /// </summary>
        /// <param name="page">The page model.</param>
        /// <param name="action">The action to execute.</param>
        /// <param name="logger">The logger to use for logging errors.</param>
        /// <returns>An IActionResult representing the result of the action or a standardized error response.</returns>
        public static async Task<IActionResult> SafeExecuteAsync(this PageModel page, Func<Task<IActionResult>> action, ILogger logger)
        {
            try
            {
                return await action();
            }
            catch (UnauthorizedAccessException ex)
            {
                logger.LogWarning(ex, "Unauthorized access attempt");
                return new UnauthorizedResult();
            }
            catch (InvalidOperationException ex)
            {
                logger.LogError(ex, "Invalid operation");
                return JsonError(ex.Message, StatusCodes.Status400BadRequest);
            }
            catch (ArgumentException ex)
            {
                logger.LogError(ex, "Invalid argument");
                return JsonError(ex.Message, StatusCodes.Status400BadRequest);
            }
            catch (Azure.RequestFailedException ex) when (ex.Status == 404)
            {
                logger.LogWarning(ex, "Resource not found");
                return JsonError("Requested resource not found", StatusCodes.Status404NotFound);
            }
            catch (Azure.RequestFailedException ex)
            {
                logger.LogError(ex, "Azure request failed: {Status}", ex.Status);
                return JsonError($"Database operation failed: {ex.Message}", StatusCodes.Status500InternalServerError);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unhandled exception");
                return JsonError("An unexpected error occurred", StatusCodes.Status500InternalServerError);
            }
        }

        /// <summary>
        /// Extension method for synchronous execution with standardized error handling.
        /// </summary>
        /// <param name="page">The page model.</param>
        /// <param name="action">The action to execute.</param>
        /// <param name="logger">The logger to use for logging errors.</param>
        /// <returns>An IActionResult representing the result of the action or a standardized error response.</returns>
        public static IActionResult SafeExecute(this PageModel page, Func<IActionResult> action, ILogger logger)
        {
            try
            {
                return action();
            }
            catch (UnauthorizedAccessException ex)
            {
                logger.LogWarning(ex, "Unauthorized access attempt");
                return new UnauthorizedResult();
            }
            catch (InvalidOperationException ex)
            {
                logger.LogError(ex, "Invalid operation");
                return JsonError(ex.Message, StatusCodes.Status400BadRequest);
            }
            catch (ArgumentException ex)
            {
                logger.LogError(ex, "Invalid argument");
                return JsonError(ex.Message, StatusCodes.Status400BadRequest);
            }
            catch (Azure.RequestFailedException ex) when (ex.Status == 404)
            {
                logger.LogWarning(ex, "Resource not found");
                return JsonError("Requested resource not found", StatusCodes.Status404NotFound);
            }
            catch (Azure.RequestFailedException ex)
            {
                logger.LogError(ex, "Azure request failed: {Status}", ex.Status);
                return JsonError($"Database operation failed: {ex.Message}", StatusCodes.Status500InternalServerError);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unhandled exception");
                return JsonError("An unexpected error occurred", StatusCodes.Status500InternalServerError);
            }
        }
    }

    /// <summary>
    /// Standard error response format for API endpoints
    /// </summary>
    public class ErrorResponse
    {
        /// <summary>
        /// Gets or sets a value indicating whether the operation was successful.
        /// Always false for error responses.
        /// </summary>
        public bool Success { get; set; } = false;

        /// <summary>
        /// Gets or sets the error message.
        /// </summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets additional error details if available.
        /// </summary>
        public object? Errors { get; set; }
    }

    /// <summary>
    /// Standard success response format for API endpoints
    /// </summary>
    public class SuccessResponse
    {
        /// <summary>
        /// Gets or sets a value indicating whether the operation was successful.
        /// Always true for success responses.
        /// </summary>
        public bool Success { get; set; } = true;

        /// <summary>
        /// Gets or sets the success message.
        /// </summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the response data.
        /// This property will be exposed directly in JSON.
        /// For example, if Data is a collection, it will be serialized as "data": [...].
        /// </summary>
        public object? Data { get; set; }
    }
}