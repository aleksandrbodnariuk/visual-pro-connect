import { useEffect, useRef, useState, useCallback } from 'react';

interface UseBidirectionalStickyOptions {
  topOffset?: number;
  bottomOffset?: number;
}

interface StickyState {
  isSticky: boolean;
  stickyDirection: 'top' | 'bottom';
  marginTop: number;
  marginBottom: number;
}

/**
 * Hook для двонаправленого sticky як у Facebook.
 * Використовує getBoundingClientRect() для точних розрахунків.
 */
export function useBidirectionalSticky(options: UseBidirectionalStickyOptions = {}) {
  const { topOffset = 80, bottomOffset = 20 } = options;
  const sidebarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [state, setState] = useState<StickyState>({
    isSticky: true,
    stickyDirection: 'top',
    marginTop: 0,
    marginBottom: 0,
  });
  
  const lastScrollY = useRef(0);
  const lastDirection = useRef<'up' | 'down'>('down');
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    const sidebar = sidebarRef.current;
    const container = containerRef.current;
    
    if (!sidebar || !container) return;
    
    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - lastScrollY.current;
    
    // Ігноруємо мінімальні зміни скролу
    if (Math.abs(scrollDelta) < 1) {
      lastScrollY.current = currentScrollY;
      return;
    }
    
    const currentDirection = scrollDelta > 0 ? 'down' : 'up';
    const directionChanged = currentDirection !== lastDirection.current;
    
    const sidebarHeight = sidebar.offsetHeight;
    const viewportHeight = window.innerHeight;
    const availableHeight = viewportHeight - topOffset - bottomOffset;
    
    // Якщо sidebar менший за доступну область viewport - просто sticky top
    if (sidebarHeight <= availableHeight) {
      setState({
        isSticky: true,
        stickyDirection: 'top',
        marginTop: 0,
        marginBottom: 0,
      });
      lastScrollY.current = currentScrollY;
      lastDirection.current = currentDirection;
      return;
    }
    
    // Отримуємо позиції через getBoundingClientRect для точності
    const containerRect = container.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();
    
    // Відстань від верху контейнера до верху sidebar
    const distanceFromContainerTop = sidebarRect.top - containerRect.top;
    const containerHeight = container.offsetHeight;
    const maxWalkDistance = containerHeight - sidebarHeight;
    
    if (directionChanged) {
      if (currentDirection === 'down') {
        // Переключаємось на sticky bottom
        // Зберігаємо поточну позицію через margin-top
        const newMarginTop = Math.max(0, Math.min(distanceFromContainerTop, maxWalkDistance));
        
        setState({
          isSticky: true,
          stickyDirection: 'bottom',
          marginTop: newMarginTop,
          marginBottom: 0,
        });
      } else {
        // Переключаємось на sticky top
        // Зберігаємо поточну позицію через margin-bottom
        const newMarginBottom = Math.max(0, maxWalkDistance - distanceFromContainerTop);
        
        setState({
          isSticky: true,
          stickyDirection: 'top',
          marginTop: 0,
          marginBottom: newMarginBottom,
        });
      }
    }
    
    lastScrollY.current = currentScrollY;
    lastDirection.current = currentDirection;
  }, [topOffset, bottomOffset]);

  const onScroll = useCallback(() => {
    if (!ticking.current) {
      requestAnimationFrame(() => {
        handleScroll();
        ticking.current = false;
      });
      ticking.current = true;
    }
  }, [handleScroll]);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    
    // Початковий розрахунок
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [onScroll, handleScroll]);

  // Генеруємо стилі для sidebar
  const sidebarStyle: React.CSSProperties = {
    position: 'sticky',
    top: state.stickyDirection === 'top' ? `${topOffset}px` : 'auto',
    bottom: state.stickyDirection === 'bottom' ? `${bottomOffset}px` : 'auto',
    marginTop: state.marginTop,
    marginBottom: state.marginBottom,
  };

  return { 
    sidebarRef, 
    containerRef,
    sidebarStyle,
    stickyDirection: state.stickyDirection,
  };
}
