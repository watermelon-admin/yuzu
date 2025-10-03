/**
 * Font management module for the designer.
 * Handles font catalog, loading, and detection of font usage.
 */

/**
 * Font category type
 */
export type FontCategory = 'sans-serif' | 'serif' | 'monospace' | 'display' | 'script' | 'vintage' | 'decorative' | 'quirky';

/**
 * Information about a font
 */
export interface FontInfo {
    /** Display name shown in UI */
    name: string;
    /** CSS font-family value */
    family: string;
    /** Font category for grouping */
    category: FontCategory;
    /** Font file name in /fonts/ directory */
    fileName: string;
    /** Runtime tracking of whether font is loaded */
    loaded: boolean;
}

/**
 * Group of fonts by category
 */
export interface FontCategoryGroup {
    /** Display label for the category */
    label: string;
    /** Fonts in this category */
    fonts: FontInfo[];
}

/**
 * Complete catalog of available fonts organized by category
 */
export const FONT_CATALOG: FontCategoryGroup[] = [
    {
        label: 'Sans-Serif',
        fonts: [
            { name: 'Roboto', family: 'Roboto', category: 'sans-serif', fileName: 'roboto-v30-latin-regular.woff2', loaded: false },
            { name: 'Open Sans', family: 'Open Sans', category: 'sans-serif', fileName: 'open-sans-regular.woff2', loaded: false },
            { name: 'Lato', family: 'Lato', category: 'sans-serif', fileName: 'lato-regular.woff2', loaded: false },
            { name: 'Montserrat', family: 'Montserrat', category: 'sans-serif', fileName: 'montserrat-regular.woff2', loaded: false },
            { name: 'Poppins', family: 'Poppins', category: 'sans-serif', fileName: 'poppins-regular.woff2', loaded: false },
            { name: 'Work Sans', family: 'Work Sans', category: 'sans-serif', fileName: 'work-sans-regular.woff2', loaded: false },
            { name: 'Inter', family: 'Inter', category: 'sans-serif', fileName: 'inter-regular.woff2', loaded: false },
            { name: 'Raleway', family: 'Raleway', category: 'sans-serif', fileName: 'raleway-regular.woff2', loaded: false },
            { name: 'Nunito', family: 'Nunito', category: 'sans-serif', fileName: 'nunito-regular.woff2', loaded: false },
            { name: 'Source Sans 3', family: 'Source Sans 3', category: 'sans-serif', fileName: 'source-sans-3-regular.woff2', loaded: false },
        ]
    },
    {
        label: 'Serif',
        fonts: [
            { name: 'Noto Serif', family: 'Noto Serif', category: 'serif', fileName: 'noto-serif-v23-latin-regular.woff2', loaded: false },
            { name: 'Merriweather', family: 'Merriweather', category: 'serif', fileName: 'merriweather-regular.woff2', loaded: false },
            { name: 'Playfair Display', family: 'Playfair Display', category: 'serif', fileName: 'playfair-display-regular.woff2', loaded: false },
            { name: 'Libre Baskerville', family: 'Libre Baskerville', category: 'serif', fileName: 'libre-baskerville-regular.woff2', loaded: false },
            { name: 'Crimson Text', family: 'Crimson Text', category: 'serif', fileName: 'crimson-text-regular.woff2', loaded: false },
            { name: 'Lora', family: 'Lora', category: 'serif', fileName: 'lora-regular.woff2', loaded: false },
        ]
    },
    {
        label: 'Monospace',
        fonts: [
            { name: 'Roboto Mono', family: 'Roboto Mono', category: 'monospace', fileName: 'roboto-mono-regular.woff2', loaded: false },
            { name: 'Source Code Pro', family: 'Source Code Pro', category: 'monospace', fileName: 'source-code-pro-regular.woff2', loaded: false },
            { name: 'JetBrains Mono', family: 'JetBrains Mono', category: 'monospace', fileName: 'jetbrains-mono-regular.woff2', loaded: false },
            { name: 'Courier Prime', family: 'Courier Prime', category: 'monospace', fileName: 'courier-prime-regular.woff2', loaded: false },
        ]
    },
    {
        label: 'Display',
        fonts: [
            { name: 'Bebas Neue', family: 'Bebas Neue', category: 'display', fileName: 'bebas-neue-regular.woff2', loaded: false },
            { name: 'Oswald', family: 'Oswald', category: 'display', fileName: 'oswald-regular.woff2', loaded: false },
            { name: 'Archivo Black', family: 'Archivo Black', category: 'display', fileName: 'archivo-black-regular.woff2', loaded: false },
            { name: 'Righteous', family: 'Righteous', category: 'display', fileName: 'righteous-regular.woff2', loaded: false },
            { name: 'Permanent Marker', family: 'Permanent Marker', category: 'display', fileName: 'permanent-marker-regular.woff2', loaded: false },
            { name: 'Pacifico', family: 'Pacifico', category: 'display', fileName: 'pacifico-regular.woff2', loaded: false },
            { name: 'Dancing Script', family: 'Dancing Script', category: 'display', fileName: 'dancing-script-regular.woff2', loaded: false },
            { name: 'Lobster', family: 'Lobster', category: 'display', fileName: 'lobster-regular.woff2', loaded: false },
            { name: 'Fredericka the Great', family: 'Fredericka the Great', category: 'display', fileName: 'fredericka-the-great-v21-latin-regular.woff2', loaded: false },
            { name: 'Caveat', family: 'Caveat', category: 'display', fileName: 'caveat-regular.woff2', loaded: false },
        ]
    },
    {
        label: 'Exotic',
        fonts: [
            // Script & Handwriting
            { name: 'Great Vibes', family: 'Great Vibes', category: 'script', fileName: 'great-vibes-regular.woff2', loaded: false },
            { name: 'Satisfy', family: 'Satisfy', category: 'script', fileName: 'satisfy-regular.woff2', loaded: false },
            { name: 'Allura', family: 'Allura', category: 'script', fileName: 'allura-regular.woff2', loaded: false },
            { name: 'Tangerine', family: 'Tangerine', category: 'script', fileName: 'tangerine-regular.woff2', loaded: false },
            { name: 'Sacramento', family: 'Sacramento', category: 'script', fileName: 'sacramento-regular.woff2', loaded: false },
            // Vintage & Retro
            { name: 'Bungee', family: 'Bungee', category: 'vintage', fileName: 'bungee-regular.woff2', loaded: false },
            { name: 'Fredoka One', family: 'Fredoka One', category: 'vintage', fileName: 'fredoka-one-regular.woff2', loaded: false },
            { name: 'Alfa Slab One', family: 'Alfa Slab One', category: 'vintage', fileName: 'alfa-slab-one-regular.woff2', loaded: false },
            { name: 'Russo One', family: 'Russo One', category: 'vintage', fileName: 'russo-one-regular.woff2', loaded: false },
            // Decorative & Artistic
            { name: 'Cinzel Decorative', family: 'Cinzel Decorative', category: 'decorative', fileName: 'cinzel-decorative-regular.woff2', loaded: false },
            { name: 'Abril Fatface', family: 'Abril Fatface', category: 'decorative', fileName: 'abril-fatface-regular.woff2', loaded: false },
            { name: 'Ultra', family: 'Ultra', category: 'decorative', fileName: 'ultra-regular.woff2', loaded: false },
            { name: 'Monoton', family: 'Monoton', category: 'decorative', fileName: 'monoton-regular.woff2', loaded: false },
            { name: 'Fascinate', family: 'Fascinate', category: 'decorative', fileName: 'fascinate-regular.woff2', loaded: false },
            // Tech & Futuristic
            { name: 'Orbitron', family: 'Orbitron', category: 'quirky', fileName: 'orbitron-regular.woff2', loaded: false },
            { name: 'Press Start 2P', family: 'Press Start 2P', category: 'quirky', fileName: 'press-start-2p-regular.woff2', loaded: false },
            { name: 'Audiowide', family: 'Audiowide', category: 'quirky', fileName: 'audiowide-regular.woff2', loaded: false },
            // Quirky & Fun
            { name: 'Bangers', family: 'Bangers', category: 'quirky', fileName: 'bangers-regular.woff2', loaded: false },
            { name: 'Creepster', family: 'Creepster', category: 'quirky', fileName: 'creepster-regular.woff2', loaded: false },
            { name: 'Cabin Sketch', family: 'Cabin Sketch', category: 'quirky', fileName: 'cabin-sketch-regular.woff2', loaded: false },
        ]
    }
];

/**
 * Flat map of all fonts for quick lookup
 */
const fontMap = new Map<string, FontInfo>();

// Initialize the font map
FONT_CATALOG.forEach(category => {
    category.fonts.forEach(font => {
        fontMap.set(font.family, font);
    });
});

/**
 * Gets a flat list of all available fonts
 * @returns Array of all FontInfo objects
 */
export function getAllFonts(): FontInfo[] {
    return Array.from(fontMap.values());
}

/**
 * Gets font information by family name
 * @param fontFamily - The CSS font-family value
 * @returns FontInfo object or undefined if not found
 */
export function getFontInfo(fontFamily: string): FontInfo | undefined {
    return fontMap.get(fontFamily);
}

/**
 * Checks if a font is loaded
 * @param fontFamily - The CSS font-family value
 * @returns True if the font is loaded, false otherwise
 */
export function isFontLoaded(fontFamily: string): boolean {
    const fontInfo = fontMap.get(fontFamily);
    if (!fontInfo) {
        return false;
    }
    return fontInfo.loaded;
}

/**
 * Loads a single font dynamically using the CSS Font Loading API
 * @param fontFamily - The CSS font-family value
 * @returns Promise that resolves when the font is loaded
 */
export async function loadFont(fontFamily: string): Promise<void> {
    const fontInfo = fontMap.get(fontFamily);

    // If font not in catalog or already loaded, return immediately
    if (!fontInfo || fontInfo.loaded) {
        return;
    }

    try {
        // Use CSS Font Loading API to load the font
        // This triggers the browser to load the @font-face resource
        await document.fonts.load(`12px "${fontFamily}"`);
        fontInfo.loaded = true;
        console.log(`[Fonts] Loaded font: ${fontFamily}`);
    } catch (error) {
        console.error(`[Fonts] Failed to load font: ${fontFamily}`, error);
    }
}

/**
 * Loads multiple fonts in parallel
 * @param fontFamilies - Array of CSS font-family values
 * @returns Promise that resolves when all fonts are loaded
 */
export async function loadFonts(fontFamilies: string[]): Promise<void> {
    const loadPromises = fontFamilies.map(family => loadFont(family));
    await Promise.all(loadPromises);
}

/**
 * Scans canvas data to find all fonts that are actually used
 * @param canvasData - The designer canvas data object
 * @returns Array of font family names that are used
 */
export function getUsedFonts(canvasData: any): string[] {
    const usedFonts = new Set<string>();

    // Check if canvasData has widgets
    if (!canvasData || !canvasData.widgets) {
        return [];
    }

    // Scan all widgets for font usage
    for (const widget of canvasData.widgets) {
        // Only text widgets have font properties
        if (widget.type === 'text' && widget.properties && widget.properties.fontFamily) {
            usedFonts.add(widget.properties.fontFamily);
        }
    }

    return Array.from(usedFonts);
}

/**
 * Preloads fonts that are used in the canvas data
 * This should be called when loading an existing design
 * @param canvasData - The designer canvas data object
 * @returns Promise that resolves when all used fonts are loaded
 */
export async function preloadUsedFonts(canvasData: any): Promise<void> {
    const usedFonts = getUsedFonts(canvasData);

    if (usedFonts.length > 0) {
        console.log(`[Fonts] Preloading ${usedFonts.length} used fonts:`, usedFonts);
        await loadFonts(usedFonts);
    }
}
