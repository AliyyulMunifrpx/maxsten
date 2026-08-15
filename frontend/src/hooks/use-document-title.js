// src/hooks/use-document-title.js
import { useEffect } from "react";

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | MaxSten` : "MaxSten";
  }, [title]);
}
