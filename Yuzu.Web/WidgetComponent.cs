namespace Yuzu.Web
{
    public class WidgetComponent
    {
        public string Type { get; set; } = string.Empty;
        public double X { get; set; }
        public double Y { get; set; }
        public double Width { get; set; }
        public double Height { get; set; }
        public int SelectionOrder { get; set; }
        public int GroupNumber { get; set; }
        public int StackOrder { get; set; }
        public string Color { get; set; } = string.Empty;
        public string FontFamily { get; set; } = string.Empty;
        public int FontSize { get; set; }
        public string Text { get; set; } = string.Empty;
        public bool IsEditing { get; set; }
    }
}
