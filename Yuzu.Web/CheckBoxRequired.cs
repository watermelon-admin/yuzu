using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using System.ComponentModel.DataAnnotations;

namespace Yuzu.Web
{
    public class CheckBoxRequired : ValidationAttribute, IClientModelValidator
    {
        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            if (value is bool boolValue && boolValue)
            {
                return ValidationResult.Success;
            }

            return new ValidationResult(ErrorMessage ?? "Please accept the Terms & Conditions.");
        }

        public void AddValidation(ClientModelValidationContext context)
        {
            context.Attributes.Add("data-val-checkboxrequired", FormatErrorMessage(context.ModelMetadata.GetDisplayName()));
        }

    }

}

