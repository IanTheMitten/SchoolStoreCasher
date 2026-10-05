import { useMemo } from 'react';
import { Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { buildBarcodeCardSvg, svgToDataUrl, svgToPngBlob, encodeBarcode } from '../../services/barcode';

interface BarcodeCardProps {
  value: string;
  name: string;
  subtitle?: string;
}

const safeFileName = (s: string) => s.replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '') || 'barcode';

export function BarcodeCard({ value, name, subtitle }: BarcodeCardProps) {
  const card = useMemo(() => buildBarcodeCardSvg({ value, name, subtitle }), [value, name, subtitle]);
  const symbology = useMemo(() => encodeBarcode(value).symbology, [value]);
  const dataUrl = useMemo(() => svgToDataUrl(card.svg), [card.svg]);

  const handleDownload = async () => {
    try {
      const blob = await svgToPngBlob(card.svg, card.width, card.height, 1200);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFileName(name)}-${value}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      toast.error(e?.message || 'Could not export PNG');
    }
  };

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) {
      iframe.remove();
      toast.error('Could not open print view');
      return;
    }
    doc.open();
    doc.write(
      `<!doctype html><html><head><title>${value}</title><style>@page{margin:12mm}body{margin:0;display:flex;justify-content:center}img{width:90mm;max-width:100%}</style></head><body><img id="b" src="${dataUrl}"></body></html>`
    );
    doc.close();
    const img = doc.getElementById('b') as HTMLImageElement;
    const go = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 2000);
    };
    if (img.complete) go();
    else img.onload = go;
  };

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-gray-200 bg-white p-2" data-testid="barcode-card">
        <img src={dataUrl} alt={`Barcode ${value} for ${name}`} className="w-full h-auto" draggable={false} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500">{symbology}</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
            <Download className="size-4 mr-1.5" />
            Download PNG
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="size-4 mr-1.5" />
            Print
          </Button>
        </div>
      </div>
    </div>
  );
}
