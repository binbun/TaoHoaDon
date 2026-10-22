import { useEffect } from 'react';
import { STORE_NAME } from '@/config';

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${STORE_NAME}` : STORE_NAME;
  }, [title]);
}
