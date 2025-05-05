// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function (): void {
    // Get references to the elements
    const pricingToggle: HTMLInputElement | null = document.getElementById('pricing') as HTMLInputElement;
    const buyProOffer: HTMLAnchorElement | null = document.getElementById('buyProOffer') as HTMLAnchorElement;
    const buyProCompare: HTMLAnchorElement | null = document.getElementById('buyProCompare') as HTMLAnchorElement;
    const monthlyPriceElements: NodeListOf<Element> = document.querySelectorAll('[data-monthly-price]');
    const annualPriceElements: NodeListOf<Element> = document.querySelectorAll('[data-annual-price]');

    // Define the URLs for monthly and annual pricing
    const monthlyUrl: string = '/payments/buy?product=pro_m_v1';
    const annualUrl: string = '/payments/buy?product=pro_y_v1';

    // Function to update price displays based on toggle state
    function updatePriceDisplay(isAnnual: boolean): void {
        if (monthlyPriceElements.length > 0 && annualPriceElements.length > 0) {
            // If annual is selected, hide monthly prices and show annual prices
            monthlyPriceElements.forEach((element: Element) => {
                element.classList.toggle('d-none', isAnnual);
            });

            annualPriceElements.forEach((element: Element) => {
                element.classList.toggle('d-none', !isAnnual);
            });
        }
    }

    // Function to update the link URLs based on the toggle state
    function updateLinks(): void {
        // Check if elements exist before proceeding
        if (!pricingToggle) {
            console.error('Pricing toggle element not found');
            return;
        }

        // Check if the toggle is checked (annual) or unchecked (monthly)
        const isAnnual: boolean = pricingToggle.checked;

        // Set the appropriate URLs based on the toggle state
        const targetUrl: string = isAnnual ? annualUrl : monthlyUrl;

        // Update price displays
        updatePriceDisplay(isAnnual);

        // Update Pro offer link if it exists
        if (buyProOffer) {
            buyProOffer.href = targetUrl;
            buyProOffer.setAttribute('aria-label', `Get started with Pro plan (${isAnnual ? 'annual' : 'monthly'} billing)`);
        }

        // Update Pro compare link if it exists
        if (buyProCompare) {
            buyProCompare.href = targetUrl;
            buyProCompare.setAttribute('aria-label', `Get started with Pro plan (${isAnnual ? 'annual' : 'monthly'} billing)`);
        }
    }

    // Set up pricing toggle functionality if it exists
    if (pricingToggle) {
        // Make sure toggle has proper accessibility attributes
        pricingToggle.setAttribute('aria-labelledby', 'monthlyLabel annualLabel');

        // Set initial URLs and price displays based on the default toggle state
        updateLinks();

        // Add event listener to update URLs when the toggle changes
        pricingToggle.addEventListener('change', updateLinks);
    } else {
        console.warn('Pricing toggle element not found - monthly pricing will be used');
        
        // If toggle doesn't exist but buttons do, set them to monthly by default
        if (buyProOffer) {
            buyProOffer.href = monthlyUrl;
        }
        
        if (buyProCompare) {
            buyProCompare.href = monthlyUrl;
        }
    }
});

