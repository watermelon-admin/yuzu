using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Volo.Abp;

namespace Yuzu.Web.Pages.Dbg
{
    [AllowAnonymous]
    public class ValidateModel : PageModel
    {
        [BindProperty]
        public InputModel Input { get; set; } = new();

        public class InputModel
        {
            [Required(ErrorMessage = "Please enter a Username.")]
            public string Username { get; set; } = string.Empty;
            
            [Required]
            public string Password { get; set; } = string.Empty;
        }

        public void OnGet()
        {
        }

        public IActionResult OnPost()
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Return a success response
            return new JsonResult(new { success = true, message = "Form submitted successfully!" });
        }
    }
}
