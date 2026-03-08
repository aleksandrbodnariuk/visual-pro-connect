

## Problem

The admin Users table uses a `grid-cols-10` layout with fixed gaps. On monitors between ~1024px and ~1536px, the content (buttons, selects, text) overflows its grid cells because the columns are too narrow.

## Solution

Wrap the desktop table in a horizontally scrollable container with a `min-width` to prevent column squashing. This ensures all columns have enough space regardless of monitor size.

### Changes in `src/components/admin/tabs/UsersTab.tsx`:

1. Wrap the desktop table `div.hidden.md:block` content in `overflow-x-auto`
2. Add `min-w-[1200px]` to the grid rows so they never shrink below a readable width
3. Add `overflow-hidden` and `min-w-0` to text cells (Name, Phone) to ensure `truncate` works properly on all cells

This is a single-file change affecting only the desktop table layout (lines ~522-598).

