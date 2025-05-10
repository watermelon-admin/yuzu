// src/pages/settings/time-zones/pagination.ts
/**
 * Set up pagination for user time zones list
 * @param totalCount Total number of items
 * @param currentPage Current page number
 * @param pageSize Number of items per page
 * @param containerId ID of the pagination container element
 * @param isSearch Whether this is for search results (true) or user timezones (false)
 * @param searchTerm Search term (only used when isSearch is true)
 */
export function setupPagination(totalCount, currentPage, pageSize, containerId, isSearch, searchTerm = '') {
    const totalPages = Math.ceil(totalCount / pageSize);
    const paginationContainer = document.getElementById(containerId);
    // Handle the container - always clear old pagination
    if (!paginationContainer) {
        return;
    }
    // Clear any existing pagination controls
    paginationContainer.innerHTML = '';
    // Skip pagination rendering if only one page
    if (totalPages <= 1) {
        return;
    }
    // Ensure current page is within valid range
    const validatedCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
    // Generate pagination HTML
    let paginationHtml = '';
    // Escape the search term for use in onclick handlers if needed
    const escapedSearchTerm = isSearch ? searchTerm.replace(/'/g, "\\'") : '';
    // Previous button
    const prevPageParams = isSearch ?
        `(${validatedCurrentPage - 1}, '${escapedSearchTerm}')` :
        `(${validatedCurrentPage - 1}, null)`;
    paginationHtml += `
    <li class="page-item ${validatedCurrentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" 
           onclick="event.preventDefault(); window.changePage${prevPageParams}" 
           aria-label="Previous"
           ${validatedCurrentPage === 1 ? 'tabindex="-1" aria-disabled="true"' : ''}>
            <span aria-hidden="true">&laquo;</span>
        </a>
    </li>`;
    // Calculate page range to display
    let startPage = Math.max(1, validatedCurrentPage - 2);
    let endPage = Math.min(totalPages, validatedCurrentPage + 2);
    // Adjust the range to show at least 5 pages if possible
    if (endPage - startPage < 4) {
        if (startPage === 1) {
            endPage = Math.min(5, totalPages);
        }
        else if (endPage === totalPages) {
            startPage = Math.max(1, totalPages - 4);
        }
    }
    // First page (if not in normal range)
    if (startPage > 1) {
        const firstPageParams = isSearch ?
            `(1, '${escapedSearchTerm}')` :
            `(1, null)`;
        paginationHtml += `
        <li class="page-item">
            <a class="page-link" href="#" 
               onclick="event.preventDefault(); window.changePage${firstPageParams}"
               aria-label="Page 1">1</a>
        </li>`;
        if (startPage > 2) {
            paginationHtml += `
            <li class="page-item disabled">
                <span class="page-link" tabindex="-1" aria-hidden="true">...</span>
            </li>`;
        }
    }
    // Page numbers in the calculated range
    for (let i = startPage; i <= endPage; i++) {
        const pageParams = isSearch ?
            `(${i}, '${escapedSearchTerm}')` :
            `(${i}, null)`;
        paginationHtml += `
        <li class="page-item ${i === validatedCurrentPage ? 'active' : ''}">
            <a class="page-link" href="#" 
               onclick="event.preventDefault(); window.changePage${pageParams}"
               aria-label="Page ${i}"
               aria-current="${i === validatedCurrentPage ? 'page' : 'false'}"
               ${i === validatedCurrentPage ? 'tabindex="0"' : ''}>
                ${i}
            </a>
        </li>`;
    }
    // Last page (if not in normal range)
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += `
            <li class="page-item disabled">
                <span class="page-link" tabindex="-1" aria-hidden="true">...</span>
            </li>`;
        }
        const lastPageParams = isSearch ?
            `(${totalPages}, '${escapedSearchTerm}')` :
            `(${totalPages}, null)`;
        paginationHtml += `
        <li class="page-item">
            <a class="page-link" href="#" 
               onclick="event.preventDefault(); window.changePage${lastPageParams}"
               aria-label="Page ${totalPages}">${totalPages}</a>
        </li>`;
    }
    // Next button
    const nextPageParams = isSearch ?
        `(${validatedCurrentPage + 1}, '${escapedSearchTerm}')` :
        `(${validatedCurrentPage + 1}, null)`;
    paginationHtml += `
    <li class="page-item ${validatedCurrentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" 
           onclick="event.preventDefault(); window.changePage${nextPageParams}" 
           aria-label="Next"
           ${validatedCurrentPage === totalPages ? 'tabindex="-1" aria-disabled="true"' : ''}>
            <span aria-hidden="true">&raquo;</span>
        </a>
    </li>`;
    // Page summary text
    if (isSearch) {
        paginationHtml += `
        <li class="page-item disabled ms-3">
            <span class="page-link bg-transparent border-0">
                ${totalCount} results found
            </span>
        </li>`;
    }
    else {
        paginationHtml += `
        <li class="page-item disabled ms-3">
            <span class="page-link bg-transparent border-0">
                Page ${validatedCurrentPage} of ${totalPages} (${totalCount} items)
            </span>
        </li>`;
    }
    // Set the HTML
    paginationContainer.innerHTML = paginationHtml;
}
//# sourceMappingURL=pagination.js.map