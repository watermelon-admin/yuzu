namespace Yuzu.Mail
{
    public interface IEmailSender
    {
        Task SendEmailAsync(string email, string subject, string message);
        Task SendEmailAsync(string email, string subject, string htmlMessage, string plainTextMessage);
    }
}
