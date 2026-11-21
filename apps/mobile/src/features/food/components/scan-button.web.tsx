// Scan is native only: the web build has no barcode scanning until the PWA work (#120), so there's no button. It
// takes scan-button.tsx's props, and needs none of them
export function ScanButton(): null {
  return null;
}
