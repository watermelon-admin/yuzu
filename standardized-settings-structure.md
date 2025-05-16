# Standardized Settings Page Structure

## Common Structure Components

All settings page sections should follow this standardized structure:

1. **Header Section**
   ```html
   <div class="d-flex align-items-center justify-content-between pt-xl-1 mb-3 pb-3">
       <h1 class="h2 mb-0 mt-4">Section Title</h1>
       <!-- Optional action button -->
       <button type="button" class="btn btn-primary px-3 px-sm-4" id="section-action-button">
           <i class="bx bx-[icon] fs-xl me-sm-2"></i>
           <span class="d-none d-sm-inline">Action Text</span>
       </button>
   </div>
   ```

2. **Viewport Container** (for scrollable content)
   ```html
   <div class="viewport-container-wrapper">
       <!-- Top fade overlay -->
       <div class="fade-overlay fade-top"></div>
       
       <!-- Scrollable container -->
       <div class="viewport-container" id="[section-name]-viewport-container">
           <div id="[section-name]-container" class="row row-cols-1 row-cols-sm-2 gx-3 gy-3" data-loaded="false">
               <!-- Loading placeholder -->
               <div class="col loading-placeholder">
                   <div class="card h-100 border-0 shadow-sm">
                       <div class="card-body d-flex align-items-center justify-content-center">
                           <div class="spinner-border text-primary" role="status">
                               <span class="visually-hidden">Loading...</span>
                           </div>
                       </div>
                   </div>
               </div>
               <!-- Items will be dynamically inserted here -->
           </div>
       </div>
       
       <!-- Bottom fade overlay -->
       <div class="fade-overlay fade-bottom"></div>
   </div>
   ```

3. **Card Template**
   ```html
   <template id="[section-name]-card-template">
       <div class="col pb-lg-2 mb-4">
           <article class="card settings-card h-100">
               <!-- Optional card image/header -->
               <div class="position-relative">
                   <img src="" class="card-img-top" alt="Card image">
               </div>

               <!-- Card body -->
               <div class="card-body">
                   <h3 class="h5 fw-semibold mb-2">
                       <span class="card-title"></span>
                   </h3>
                   <p class="card-text"></p>
                   <!-- Additional content specific to the section -->
               </div>

               <!-- Card footer -->
               <div class="card-footer d-flex align-items-center py-3">
                   <div class="d-flex">
                       <!-- Action buttons -->
                       <button type="button" class="btn btn-sm btn-outline-primary me-2">
                           <i class="bx bx-[icon] fs-xl me-1"></i>
                           <span class="d-none d-md-inline">Primary Action</span>
                       </button>
                       <button type="button" class="btn btn-sm btn-outline-danger">
                           <i class="bx bx-trash fs-xl me-1"></i>
                           <span class="d-none d-md-inline">Delete</span>
                       </button>
                   </div>
               </div>
           </article>
       </div>
   </template>
   ```

4. **Modal Structure**
   ```html
   <div class="modal fade" id="[section-name]-[action]-modal" tabindex="-1" aria-labelledby="[section-name]-[action]-modal-label" aria-hidden="true">
       <div class="modal-dialog">
           <div class="modal-content">
               <div class="modal-header">
                   <h5 class="modal-title" id="[section-name]-[action]-modal-label">Modal Title</h5>
                   <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
               </div>
               <div class="modal-body">
                   <!-- Modal content -->
               </div>
               <div class="modal-footer">
                   <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                   <button type="button" class="btn btn-primary" id="[section-name]-[action]-confirm-button">Confirm</button>
               </div>
           </div>
       </div>
   </div>
   ```

## Section-Specific Guidelines

### Card-based Sections (Break Types, Time Zones, Backgrounds)
- Use the viewport container pattern
- Consistent row-cols classes: `row-cols-1 row-cols-sm-2` (consider row-cols-md-3 for Backgrounds)
- Consistent card structure with settings-card class
- Standardized button placement in card footer

### Form-based Sections (Account Details)
- Use section headings with h2.h5.text-primary class
- Group related form elements with border-bottom separators
- Consistent form control sizing and spacing
- Standardized button styling and width

### Panel-based Sections (Membership)
- Use card components with consistent styling
- Standardized card headers
- Consistent spacing and typography

## Responsive Behavior
- All sections should maintain consistent responsive breakpoints
- Mobile view: Single column (row-cols-1)
- Tablet view: Two columns (row-cols-sm-2)
- Desktop view: Two or three columns depending on content density

## Accessibility
- All buttons and interactive elements must have appropriate aria attributes
- Proper heading hierarchy
- Descriptive alt text for images
- Meaningful aria-labels for interactive components