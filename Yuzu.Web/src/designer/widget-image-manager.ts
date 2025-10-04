/**
 * Widget Image Manager
 * Handles uploading, managing, and selecting images for image widgets
 */

import { ImageWidget } from './widgets/image-widget.js';

declare const FilePond: any;
declare const bootstrap: any;

/**
 * Represents an uploaded widget image
 */
export interface WidgetImage {
    name: string;
    url: string;
    thumbnailUrl: string;
    size: number;
    uploadDate: string;
    title?: string;
}

/**
 * Response from the upload endpoint
 */
export interface UploadResponse {
    success: boolean;
    message: string;
    data?: {
        imageName: string;
        imageUrl: string;
        thumbnailUrl: string;
    };
    errors?: any;
}

/**
 * Response from the list images endpoint
 */
export interface ListImagesResponse {
    success: boolean;
    message: string;
    data?: {
        images: WidgetImage[];
        count: number;
        totalSize: number;
    };
}

/**
 * Widget Image Manager class
 */
export class WidgetImageManager {
    private filePond: any = null;
    private uploadModal: any = null;
    private managementModal: any = null;
    private currentWidget: ImageWidget | null = null;
    private userId: string;
    private breakTypeId: string;

    constructor(userId: string, breakTypeId: string) {
        this.userId = userId;
        this.breakTypeId = breakTypeId;
        this.init();
    }

    /**
     * Initialize the widget image manager
     */
    private init(): void {
        this.setupModals();
        this.setupFilePond();
        this.setupEventListeners();
    }

    /**
     * Setup Bootstrap modals
     */
    private setupModals(): void {
        const uploadModalEl = document.getElementById('widgetImageUploadModal');
        const managementModalEl = document.getElementById('widgetImageManagementModal');

        if (uploadModalEl) {
            this.uploadModal = new bootstrap.Modal(uploadModalEl);
        }

        if (managementModalEl) {
            this.managementModal = new bootstrap.Modal(managementModalEl);
        }
    }

    /**
     * Setup FilePond for image upload
     */
    private setupFilePond(): void {
        const fileInput = document.getElementById('widget-image-file-upload');
        if (!fileInput) return;

        // Create FilePond instance
        this.filePond = FilePond.create(fileInput, {
            acceptedFileTypes: ['image/png', 'image/jpeg'],
            maxFileSize: '5MB',
            labelIdle: 'Drag & Drop your image or <span class="filepond--label-action">Browse</span>',
            labelFileProcessing: 'Uploading',
            labelFileProcessingComplete: 'Upload complete',
            labelFileProcessingAborted: 'Upload cancelled',
            labelFileProcessingError: 'Error during upload',
            labelTapToCancel: 'tap to cancel',
            labelTapToRetry: 'tap to retry',
            labelTapToUndo: 'tap to undo',
            imagePreviewHeight: 200,
            imageCropAspectRatio: '16:9',
            imageResizeTargetWidth: 1920,
            imageResizeTargetHeight: 1080,
            imageResizeMode: 'contain',
            imageResizeUpscale: false,
            stylePanelLayout: 'compact',
            styleLoadIndicatorPosition: 'center bottom',
            styleProgressIndicatorPosition: 'right bottom',
            styleButtonRemoveItemPosition: 'left bottom',
            styleButtonProcessItemPosition: 'right bottom'
        });

        // Handle file validation
        this.filePond.on('warning', (error: any) => {
            this.showValidationError('widget-image-file-validation-message', error.body);
        });
    }

    /**
     * Setup event listeners
     */
    private setupEventListeners(): void {
        // Upload button click
        const uploadButton = document.getElementById('widget-image-modal-upload-button');
        if (uploadButton) {
            uploadButton.addEventListener('click', () => this.handleUpload());
        }

        // Open upload modal from management modal
        const openUploadButton = document.getElementById('btn-open-widget-image-upload');
        if (openUploadButton) {
            openUploadButton.addEventListener('click', () => {
                if (this.managementModal) {
                    this.managementModal.hide();
                }
                this.openUploadModal();
            });
        }

        // Listen for image widget change requests
        document.addEventListener('image-widget-change-request', ((event: CustomEvent) => {
            const widgetId = event.detail.widgetId;
            // Find the widget by ID and store it
            // This will be set by the designer when the event is dispatched
            this.openManagementModal();
        }) as EventListener);
    }

    /**
     * Open the upload modal
     */
    public openUploadModal(widget?: ImageWidget): void {
        this.currentWidget = widget || null;

        // Clear previous state
        this.clearValidationErrors();
        if (this.filePond) {
            this.filePond.removeFiles();
        }
        const titleInput = document.getElementById('widget-image-title') as HTMLInputElement;
        if (titleInput) {
            titleInput.value = '';
        }

        // Show modal
        if (this.uploadModal) {
            this.uploadModal.show();
        }
    }

    /**
     * Open the management modal
     */
    public openManagementModal(widget?: ImageWidget): void {
        this.currentWidget = widget || null;

        // Load images
        this.loadImages();

        // Show modal
        if (this.managementModal) {
            this.managementModal.show();
        }
    }

    /**
     * Handle upload button click
     */
    private async handleUpload(): Promise<void> {
        // Clear previous errors
        this.clearValidationErrors();

        // Get file from FilePond
        const files = this.filePond.getFiles();
        if (files.length === 0) {
            this.showValidationError('widget-image-file-validation-message', 'Please select an image file');
            return;
        }

        const file = files[0].file;

        // Get title
        const titleInput = document.getElementById('widget-image-title') as HTMLInputElement;
        const title = titleInput?.value || '';

        // Show loading state
        const uploadButton = document.getElementById('widget-image-modal-upload-button') as HTMLButtonElement;
        if (uploadButton) {
            uploadButton.disabled = true;
            uploadButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Uploading...';
        }

        try {
            // Upload the image
            const result = await this.uploadImage(file, title);

            if (result.success && result.data) {
                // Show success message
                this.showToast('Image uploaded successfully', 'success');

                // If there's a current widget, update it
                if (this.currentWidget) {
                    this.currentWidget.setImage(
                        result.data.imageUrl,
                        result.data.imageName,
                        result.data.thumbnailUrl
                    );
                }

                // Dispatch event for designer to handle
                const event = new CustomEvent('widget-image-uploaded', {
                    detail: {
                        imageName: result.data.imageName,
                        imageUrl: result.data.imageUrl,
                        thumbnailUrl: result.data.thumbnailUrl,
                        widgetId: this.currentWidget?.getId()
                    },
                    bubbles: true
                });
                document.dispatchEvent(event);

                // Close modal
                if (this.uploadModal) {
                    this.uploadModal.hide();
                }
            } else {
                this.showValidationError('widget-image-form-validation-message', result.message || 'Upload failed');
                const alertEl = document.getElementById('widget-image-form-validation-alert');
                if (alertEl) {
                    alertEl.classList.remove('d-none');
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showValidationError('widget-image-form-validation-message', 'An error occurred during upload');
            const alertEl = document.getElementById('widget-image-form-validation-alert');
            if (alertEl) {
                alertEl.classList.remove('d-none');
            }
        } finally {
            // Reset button state
            if (uploadButton) {
                uploadButton.disabled = false;
                uploadButton.innerHTML = 'Upload';
            }
        }
    }

    /**
     * Upload an image to the server
     */
    private async uploadImage(file: File, title: string): Promise<UploadResponse> {
        // Get anti-forgery token
        const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
        if (!tokenInput || !tokenInput.value) {
            throw new Error('Anti-forgery token not found');
        }
        const token = tokenInput.value;

        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('userId', this.userId);
        formData.append('breakTypeId', this.breakTypeId);

        // Send request
        const url = '/Designer?handler=UploadWidgetImage';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'RequestVerificationToken': token
            },
            body: formData,
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Load images from the server
     */
    private async loadImages(): Promise<void> {
        const loadingEl = document.getElementById('widget-image-loading');
        const errorEl = document.getElementById('widget-image-error');
        const gridEl = document.getElementById('widget-image-grid');
        const emptyEl = document.getElementById('widget-image-empty');
        const storageInfoEl = document.getElementById('widget-image-storage-info');

        // Show loading
        if (loadingEl) loadingEl.classList.remove('d-none');
        if (errorEl) errorEl.classList.add('d-none');
        if (gridEl) gridEl.classList.add('d-none');
        if (emptyEl) emptyEl.classList.add('d-none');

        try {
            // Get anti-forgery token
            const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement;
            if (!tokenInput || !tokenInput.value) {
                throw new Error('Anti-forgery token not found');
            }
            const token = tokenInput.value;

            // Send request
            const url = `/Designer?handler=WidgetImages&userId=${encodeURIComponent(this.userId)}&breakTypeId=${encodeURIComponent(this.breakTypeId)}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'RequestVerificationToken': token
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result: ListImagesResponse = await response.json();

            if (result.success && result.data) {
                const images = result.data.images || [];

                // Hide loading
                if (loadingEl) loadingEl.classList.add('d-none');

                if (images.length === 0) {
                    // Show empty state
                    if (emptyEl) emptyEl.classList.remove('d-none');
                } else {
                    // Show grid
                    if (gridEl) {
                        gridEl.classList.remove('d-none');
                        this.renderImages(images, gridEl);
                    }
                }

                // Update storage info
                if (storageInfoEl) {
                    const sizeFormatted = this.formatBytes(result.data.totalSize);
                    storageInfoEl.textContent = `${result.data.count} images • ${sizeFormatted}`;
                }
            } else {
                throw new Error(result.message || 'Failed to load images');
            }
        } catch (error) {
            console.error('Error loading images:', error);
            if (loadingEl) loadingEl.classList.add('d-none');
            if (errorEl) {
                errorEl.classList.remove('d-none');
                errorEl.textContent = 'Error loading images. Please try again later.';
            }
        }
    }

    /**
     * Render images in the grid
     */
    private renderImages(images: WidgetImage[], container: HTMLElement): void {
        container.innerHTML = '';

        images.forEach(image => {
            const col = document.createElement('div');
            col.className = 'col';

            const card = document.createElement('div');
            card.className = 'card h-100 widget-image-card';
            card.style.cursor = 'pointer';

            const img = document.createElement('img');
            img.src = image.thumbnailUrl;
            img.className = 'card-img-top';
            img.alt = image.title || image.name;
            img.style.objectFit = 'cover';
            img.style.height = '150px';

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body p-2';

            const title = document.createElement('h6');
            title.className = 'card-title mb-1 small';
            title.textContent = image.title || image.name;

            const size = document.createElement('p');
            size.className = 'card-text text-muted small mb-0';
            size.textContent = this.formatBytes(image.size);

            cardBody.appendChild(title);
            cardBody.appendChild(size);

            card.appendChild(img);
            card.appendChild(cardBody);

            // Click to select image
            card.addEventListener('click', () => this.selectImage(image));

            col.appendChild(card);
            container.appendChild(col);
        });
    }

    /**
     * Select an image for the current widget
     */
    private selectImage(image: WidgetImage): void {
        if (this.currentWidget) {
            this.currentWidget.setImage(image.url, image.name, image.thumbnailUrl);
        }

        // Dispatch event
        const event = new CustomEvent('widget-image-selected', {
            detail: {
                imageName: image.name,
                imageUrl: image.url,
                thumbnailUrl: image.thumbnailUrl,
                widgetId: this.currentWidget?.getId()
            },
            bubbles: true
        });
        document.dispatchEvent(event);

        // Close modal
        if (this.managementModal) {
            this.managementModal.hide();
        }

        this.showToast('Image applied successfully', 'success');
    }

    /**
     * Show a validation error
     */
    private showValidationError(elementId: string, message: string): void {
        const errorEl = document.getElementById(elementId);
        if (errorEl) {
            errorEl.textContent = message;
        }
    }

    /**
     * Clear all validation errors
     */
    private clearValidationErrors(): void {
        const errorElements = [
            'widget-image-title-validation-message',
            'widget-image-file-validation-message',
            'widget-image-form-validation-message'
        ];

        errorElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = '';
            }
        });

        const alertEl = document.getElementById('widget-image-form-validation-alert');
        if (alertEl) {
            alertEl.classList.add('d-none');
        }
    }

    /**
     * Format bytes to human-readable string
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Show a toast notification
     */
    private showToast(message: string, type: 'success' | 'error' = 'success'): void {
        // Using Toastify (already available in Designer.cshtml)
        if (typeof (window as any).Toastify !== 'undefined') {
            (window as any).Toastify({
                text: message,
                duration: 3000,
                gravity: 'top',
                position: 'right',
                style: {
                    background: type === 'success' ? '#28a745' : '#dc3545'
                }
            }).showToast();
        }
    }

    /**
     * Set the current widget for image upload/change
     */
    public setCurrentWidget(widget: ImageWidget): void {
        this.currentWidget = widget;
    }
}
