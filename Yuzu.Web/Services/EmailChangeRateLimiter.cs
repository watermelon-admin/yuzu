using System;
using System.Collections.Concurrent;
using System.Linq;

namespace Yuzu.Web.Services
{
    /// <summary>
    /// Simple in-memory rate limiter for email change requests.
    /// Prevents abuse by limiting the number of email change attempts per user.
    /// </summary>
    public class EmailChangeRateLimiter
    {
        private readonly ConcurrentDictionary<string, ConcurrentQueue<DateTime>> _attempts = new();
        private readonly TimeSpan _windowSize = TimeSpan.FromHours(1);
        private readonly int _maxAttempts = 3;

        /// <summary>
        /// Checks if a user has exceeded the rate limit for email change requests.
        /// </summary>
        /// <param name="userId">The user ID to check</param>
        /// <returns>True if allowed, false if rate limit exceeded</returns>
        public bool IsAllowed(string userId)
        {
            var now = DateTime.UtcNow;
            var attempts = _attempts.GetOrAdd(userId, _ => new ConcurrentQueue<DateTime>());

            // Remove old attempts outside the time window
            while (attempts.TryPeek(out var oldest) && now - oldest > _windowSize)
            {
                attempts.TryDequeue(out _);
            }

            // Check if user has exceeded the limit
            if (attempts.Count >= _maxAttempts)
            {
                return false;
            }

            // Record this attempt
            attempts.Enqueue(now);
            return true;
        }

        /// <summary>
        /// Gets the remaining time until the user can make another request.
        /// </summary>
        /// <param name="userId">The user ID to check</param>
        /// <returns>TimeSpan until next allowed request, or TimeSpan.Zero if allowed now</returns>
        public TimeSpan GetRetryAfter(string userId)
        {
            if (!_attempts.TryGetValue(userId, out var attempts))
            {
                return TimeSpan.Zero;
            }

            var now = DateTime.UtcNow;
            var validAttempts = attempts.Where(a => now - a <= _windowSize).ToList();

            if (validAttempts.Count < _maxAttempts)
            {
                return TimeSpan.Zero;
            }

            // Find the oldest attempt
            var oldest = validAttempts.Min();
            var retryAfter = _windowSize - (now - oldest);

            return retryAfter > TimeSpan.Zero ? retryAfter : TimeSpan.Zero;
        }

        /// <summary>
        /// Gets a user-friendly message about the rate limit.
        /// </summary>
        public string GetRateLimitMessage()
        {
            return $"You can only request {_maxAttempts} email changes per hour. Please try again later.";
        }
    }
}
