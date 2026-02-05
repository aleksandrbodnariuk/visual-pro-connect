import { useEffect, useRef, useState, useCallback } from 'react';

interface UseBidirectionalStickyOptions {
  topOffset?: number;
  bottomOffset?: number;
}

/**
 * Hook для двонаправленого sticky як у Facebook.
 * Sidebar "прилипає" знизу при прокрутці вниз, зверху при прокрутці вгору.
 */
export function useBidirectionalSticky(options: UseBidirectionalStickyOptions = {}) {
  const { topOffset = 80, bottomOffset = 20 } = options;
  const sidebarRef = useRef<HTMLElement>(null);
  const [stickyStyle, setStickyStyle] = useState<React.CSSProperties>({
    position: 'sticky',
    top: `${topOffset}px`,
  });
  
  // Зберігаємо стан прокрутки
  const scrollState = useRef({
    lastScrollY: 0,
    scrollDirection: 'down' as 'up' | 'down',
    isStuckTop: true,
    isStuckBottom: false,
    translateY: 0,
  });

  const handleScroll = useCallback(() => {
    if (!sidebarRef.current) return;

    const sidebar = sidebarRef.current;
    const sidebarRect = sidebar.getBoundingClientRect();
    const sidebarHeight = sidebarRect.height;
    const viewportHeight = window.innerHeight;
    const currentScrollY = window.scrollY;
    const state = scrollState.current;
    
    // Визначаємо напрямок прокрутки
    const newDirection = currentScrollY > state.lastScrollY ? 'down' : 'up';
    const directionChanged = state.scrollDirection !== newDirection;
    
    // Доступний простір для sidebar
    const availableHeight = viewportHeight - topOffset - bottomOffset;
    
    // Якщо sidebar менший за viewport - просто sticky top
    if (sidebarHeight <= availableHeight) {
      setStickyStyle({
        position: 'sticky',
        top: `${topOffset}px`,
      });
      state.lastScrollY = currentScrollY;
      state.scrollDirection = newDirection;
      return;
    }
    
    // Різниця висот
    const heightDiff = sidebarHeight - availableHeight;
    
    if (newDirection === 'down') {
      // Прокрутка ВНИЗ
      if (directionChanged && state.isStuckTop) {
        // Якщо змінили напрямок з UP на DOWN і були прикріплені зверху
        // Фіксуємо поточну позицію через translateY
        state.translateY = Math.max(0, Math.min(currentScrollY - topOffset, heightDiff));
        state.isStuckTop = false;
        state.isStuckBottom = false;
      }
      
      // Перевіряємо чи досягли низу sidebar
      if (sidebarRect.bottom <= viewportHeight - bottomOffset) {
        // Прилипаємо до низу viewport
        setStickyStyle({
          position: 'sticky',
          top: `${topOffset - heightDiff}px`,
        });
        state.isStuckBottom = true;
        state.isStuckTop = false;
      } else if (!state.isStuckBottom) {
        // Ще не досягли низу - sidebar рухається з контентом
        setStickyStyle({
          position: 'sticky',
          top: `${topOffset}px`,
        });
      }
    } else {
      // Прокрутка ВГОРУ
      if (directionChanged && state.isStuckBottom) {
        // Якщо змінили напрямок з DOWN на UP і були прикріплені знизу
        state.isStuckTop = false;
        state.isStuckBottom = false;
      }
      
      // Перевіряємо чи досягли верху sidebar
      if (sidebarRect.top >= topOffset) {
        // Прилипаємо до верху viewport
        setStickyStyle({
          position: 'sticky',
          top: `${topOffset}px`,
        });
        state.isStuckTop = true;
        state.isStuckBottom = false;
      } else if (!state.isStuckTop) {
        // Ще не досягли верху - sidebar рухається з контентом
        setStickyStyle({
          position: 'sticky',
          top: `${topOffset - heightDiff}px`,
        });
      }
    }
    
    state.lastScrollY = currentScrollY;
    state.scrollDirection = newDirection;
  }, [topOffset, bottomOffset]);

  useEffect(() => {
    // Ініціалізація
    scrollState.current.lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    
    // Початковий виклик
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [handleScroll]);

  return { sidebarRef, stickyStyle };
}
