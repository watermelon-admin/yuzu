using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Net.Codecrete.QrCodeGenerator;
using System.Text;

namespace Yuzu.Web.Pages.Services;

[ValidateAntiForgeryToken]
public class QRModel : PageModel
{
    private readonly IAntiforgery _antiforgery;
    
    public QRModel(IAntiforgery antiforgery)
    {
        _antiforgery = antiforgery;
    }
    
    // Define properties for the QR code generation
    public string Text { get; set; } = string.Empty;
    public int ECC { get; set; } = 3;
    public int BorderWidth { get; set; } = 0;

    // Define the error correction levels
    private static readonly QrCode.Ecc[] errorCorrectionLevels = [QrCode.Ecc.Low, QrCode.Ecc.Medium, QrCode.Ecc.Quartile, QrCode.Ecc.High];

    // Handle the GET request for generating the QR code
    public IActionResult OnGet([FromQuery] string text, [FromQuery] int ecc = 3, [FromQuery] int borderWidth = 0)
    {
        // Encode the text into a QR code using the specified error correction level
        var qrCode = QrCode.EncodeText(text, errorCorrectionLevels[(int)ecc]);

        string svgString = qrCode.ToSvgString(0);
        // Hack to get transparent background. No apparent way to do this using QRCode generator.
        // Replacing '#ffffff' (white) with 'rgba(0, 0, 0, 0)' (transparent)
        string transparentSvgString = svgString.Replace("fill=\"#ffffff\"", "fill=\"rgba(0, 0, 0, 0)\"");

        // Convert the SVG string to a byte arry to transmit
        byte[] svg = Encoding.UTF8.GetBytes(transparentSvgString);

        // Return the SVG image as a file content result with the MIME type "image/svg xml"
        return new FileContentResult(svg, "image/svg+xml");
    }
}