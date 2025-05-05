namespace Yuzu.Web.Tools
{
    public static class Text
    {
        // Takes a comma separated string and returns a list of strings
        public static List<string> SplitString(string input)
        {
            return input.Split(',').ToList();
        }

    }
}
