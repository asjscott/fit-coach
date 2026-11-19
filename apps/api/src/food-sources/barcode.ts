// The same product's barcode reads differently by phone and source: a 12-digit UPC-A is a 13-digit EAN with a leading
// 0 on an iPhone, and sources store GTINs padded to 13 or 14. With the leading zeros dropped they compare equal
export const barcodeKey = (code: string) => code.replace(/^0+/, "");

// The 12-digit UPC-A form of a barcode padded with leading zeros, the form most of USDA's branded foods are stored in
export const upcOf = (code: string) => barcodeKey(code).padStart(12, "0");
