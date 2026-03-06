import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';

/**
 * Tracks page views on route changes in a SPA.
 * Must be rendered inside <BrowserRouter>.
 */
export function useAnalyticsTracker() {
  const location = useLocation();
  const initial = useRef(true);

  useEffect(() => {
    // Track initial load and subsequent route changes
    trackPageView(location.pathname);
    initial.current = false;
  }, [location.pathname]);
}
