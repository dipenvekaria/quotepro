// Rasterize every page of a PDF to PNG using macOS PDFKit via the JXA ObjC
// bridge — avoids needing poppler/pdftoppm installed.
// usage: osascript -l JavaScript pdf2png.jxa.js <in.pdf> <outDir> <scale>
ObjC.import('Foundation');
ObjC.import('AppKit');   // NSBitmapImageRep lives here, not in Quartz
ObjC.import('Quartz');   // PDFDocument / PDFPage

function run(argv) {
  const inPath = argv[0];
  const outDir = argv[1];
  const scale = parseFloat(argv[2] || '2');

  const url = $.NSURL.fileURLWithPath($(inPath));
  const doc = $.PDFDocument.alloc.initWithURL(url);
  // ObjC nil surfaces as an object whose isNil() is true — `.js` is undefined
  // for non-collection NSObjects, so it can't be used as the nil test.
  if (doc.isNil()) return 'ERROR: could not open PDF at ' + inPath;

  const n = doc.pageCount;
  const written = [];

  for (let i = 0; i < n; i++) {
    const page = doc.pageAtIndex(i);
    const box = page.boundsForBox($.kPDFDisplayBoxMediaBox);
    const w = Math.round(box.size.width * scale);
    const h = Math.round(box.size.height * scale);

    const img = page.thumbnailOfSizeForBox($.NSMakeSize(w, h), $.kPDFDisplayBoxMediaBox);
    const tiff = img.TIFFRepresentation;
    const rep = $.NSBitmapImageRep.imageRepWithData(tiff);
    // 4 == NSBitmapImageFileTypePNG
    const png = rep.representationUsingTypeProperties(4, $.NSDictionary.dictionary);
    const out = outDir + '/page-' + String(i + 1).padStart(2, '0') + '.png';
    png.writeToFileAtomically($(out), true);
    written.push(out.split('/').pop() + ' ' + w + 'x' + h);
  }
  return 'pages: ' + n + '\n' + written.join('\n');
}
