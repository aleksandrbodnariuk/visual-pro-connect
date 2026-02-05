import { useEffect, useRef, useState, useCallback } from 'react';

interface UseBidirectionalStickyOptions {
  topOffset?: number;
  bottomOffset?: number;
}

interface StickyState {
  stickyDirection: 'top' | 'bottom';
  offsetMargin: number;
}

/**
 * Hook для двонаправленого sticky як у Facebook.
 * Використовує margin-top/margin-bottom для "заморожування" позиції sidebar.
 */
export function useBidirectionalSticky(options: UseBidirectionalStickyOptions = {}) {
  const { topOffset = 80, bottomOffset = 20 } = options;
  const sidebarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [state, setState] = useState<StickyState>({
    stickyDirection: 'top',
    offsetMargin: 0,
  });
  
  // Відстежуємо попередню позицію прокрутки
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    const sidebar = sidebarRef.current;
    const container = containerRef.current;
    
    if (!sidebar || !container) return;
    
    const currentScrollY = window.scrollY;
    const isScrollingDown = currentScrollY > lastScrollY.current;
    const newDirection = isScrollingDown ? 'bottom' : 'top';
    
    // Оновлюємо стан тільки при зміні напрямку
    setState(prevState => {
      if (prevState.stickyDirection === newDirection) {
        return prevState;
      }
      
      // Розраховуємо пройдену відстань
      const distanceWalked = sidebar.offsetTop;
      const sidebarHeight = sidebar.clientHeight;
      const containerHeight = container.clientHeight;
      
      let newOffset = 0;
      
      if (newDirection === 'bottom') {
        // Перед sticky bottom - зберігаємо відстань від верху
        newOffset = distanceWalked;
      } else {
        // Перед sticky top - зберігаємо відстань від низу
        const totalWalkingSpace = containerHeight - sidebarHeight;
        const spaceLeftToWalk = totalWalkingSpace - distanceWalked;
        newOffset = Math.max(0, spaceLeftToWalk);
      }
      
      return {
        stickyDirection: newDirection,
        offsetMargin: newOffset,
      };
    });
    
    lastScrollY.current = currentScrollY;
  }, []);

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
    
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [onScroll]);

  // Генеруємо стилі для sidebar
  const sidebarStyle: React.CSSProperties = {
    position: 'sticky',
    top: state.stickyDirection === 'top' ? `${topOffset}px` : 'auto',
    bottom: state.stickyDirection === 'bottom' ? `${bottomOffset}px` : 'auto',
    marginTop: state.stickyDirection === 'bottom' ? `${state.offsetMargin}px` : 0,
    marginBottom: state.stickyDirection === 'top' ? `${state.offsetMargin}px` : 0,
  };

  // Генеруємо стилі для контейнера
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: state.stickyDirection === 'bottom' ? 'flex-end' : 'flex-start',
    minHeight: '100%',
  };

  return { 
    sidebarRef, 
    containerRef,
    sidebarStyle, 
    containerStyle,
    stickyDirection: state.stickyDirection,
  };
}
