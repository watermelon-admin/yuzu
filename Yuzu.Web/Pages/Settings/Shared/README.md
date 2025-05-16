# Standardized Settings Section Template

## Overview

This template unifies the structure of all settings page sections to ensure consistent layout, styling, and user experience across the application. It provides a standardized header section, viewport container, and card grid layout that can be easily customized for different content types.

## Usage

To use the standardized section template in a settings section:

1. Create your section partial view (e.g., `_BreakTypesPartial.cshtml`)
2. Include the template at the top of your partial
3. Add your section-specific content after the template
4. Configure the template using ViewData parameters

### Example Usage

```csharp
@{
    // Configure the template
    ViewData["SectionId"] = "break-types";
    ViewData["SectionTitle"] = "Break Types";
    ViewData["ContainerColumns"] = "row-cols-1 row-cols-sm-2";
    ViewData["ShowViewport"] = true;
    ViewData["ActionButton"] = new Dictionary<string, string>
    {
        { "id", "add-new-break-type-button" },
        { "icon", "bx bx-plus-circle" },
        { "text", "Add New Break Type" },
        { "requiresSubscription", "true" }
    };
}

@* Include the standardized template *@
<partial name="~/Pages/Settings/Shared/_StandardSectionTemplate.cshtml" />

@* Add your section-specific content *@
<template id="break-type-template">
    <!-- Card template content -->
</template>

<!-- Modals and other section-specific content -->
```

## Configuration Parameters

The template accepts the following configuration parameters via ViewData:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| SectionId | string | "" | Unique identifier for the section (used for element IDs) |
| SectionTitle | string | "Section Title" | Title displayed in the section header |
| ContainerColumns | string | "row-cols-1 row-cols-sm-2" | Bootstrap grid classes for the card container |
| ShowViewport | bool | true | Whether to show the viewport container (scrollable area) |
| ActionButton | Dictionary<string, string> | null | Configuration for the action button (if any) |

### Action Button Configuration

The ActionButton dictionary supports the following keys:

| Key | Description |
|-----|-------------|
| id | Button ID attribute |
| icon | CSS classes for the button icon |
| text | Button text |
| onclick | JavaScript onclick handler |
| data-bs-toggle | Bootstrap data-bs-toggle attribute (for modals) |
| data-bs-target | Bootstrap data-bs-target attribute (for modals) |
| requiresSubscription | If "true", shows the Pro badge for non-subscribers |

## Best Practices

1. Use consistent section IDs: `break-types`, `time-zones`, `backgrounds`, etc.
2. Maintain consistent responsive behavior:
   - Single column on mobile: `row-cols-1`
   - Two columns on tablet: `row-cols-sm-2`
   - Optional three columns on desktop for dense content: `row-cols-md-3`
3. Keep card templates consistent:
   - Use `settings-card` class for all cards
   - Follow the standard header-body-footer structure
   - Use consistent button styling and placement
   - Standard primary/danger button colors for actions