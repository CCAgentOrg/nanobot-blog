/**
 * Type declarations for Web Vitals
 */
declare const webVitals: {
  onCLS: (callback: (metric: any) => void) => void;
  onFID: (callback: (metric: any) => void) => void;
  onLCP: (callback: (metric: any) => void) => void;
  onTTFB: (callback: (metric: any) => void) => void;
  onFCP: (callback: (metric: any) => void) => void;
  onINP: (callback: (metric: any) => void) => void;
};

// Also declare on window for inline scripts
declare global {
  interface Window {
    webVitals: typeof webVitals;
  }
}

export {};
