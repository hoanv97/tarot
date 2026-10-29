export const SITE_CONTENT_KEYS = ['home', 'samples', 'privacy', 'terms'] as const;
export type SiteContentKey = (typeof SITE_CONTENT_KEYS)[number];

export const ANALYSIS_SECTIONS = ['labels', 'safety', 'intents', 'lead', 'overview', 'positions', 'cards', 'transitions', 'pairs', 'single_flow', 'closing', 'card_tone'] as const;
export type AnalysisSection = (typeof ANALYSIS_SECTIONS)[number];

export const CARDS_PER_PAGE = 20;
