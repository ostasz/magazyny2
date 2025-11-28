import PDFDocument from 'pdfkit';
import path from 'path';

interface B2BOptimizationData {
  name: string;
  createdAt: Date;
  preparedBy?: string;

  // Rekomendacje
  recommendedCapacityMwh: number;
  recommendedPowerMw: number;
  estimatedAnnualSavingsPln: number;

  // Parametry
  maxCyclesPerDay: number;
  minSpreadPlnMwh: number;
  socMin: number;
  socMax: number;
  efficiency: number;
  distributionCostPlnMwh: number;
}

// Kolory Ekovoltis z brandbooku
const COLORS = {
  primary: '#009D8F',
  secondary: '#008275',
  lightTurquoise: '#047BAAE',
  gray: '#E1E1E1',
  text: '#333333',
  lightText: '#666666',
};

// Funkcja pomocnicza do formatowania daty w UTC
function formatDateUTC(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

export async function generateB2BPDFReport(data: B2BOptimizationData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true,
      });

      // Register local Roboto fonts (supports Polish characters)
      const fontPath = path.join(process.cwd(), 'server', 'fonts');
      doc.registerFont('Roboto', path.join(fontPath, 'Roboto-Regular.ttf'));
      doc.registerFont('Roboto-Bold', path.join(fontPath, 'Roboto-Medium.ttf'));

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Logo Ekovoltis jako tekst
      doc.fontSize(28)
        .fillColor(COLORS.primary)
        .font('Roboto-Bold')
        .text('EKOVOLTIS', 50, 45);

      // Tytuł raportu
      doc.fontSize(24)
        .fillColor(COLORS.primary)
        .font('Roboto-Bold')
        .text('Dobór Wielkości Magazynu dla B2B', 50, 100, { align: 'center' });

      doc.fontSize(12)
        .fillColor(COLORS.lightText)
        .font('Roboto')
        .text(data.name, { align: 'center' });

      doc.text(`Data wygenerowania: ${formatDateUTC(new Date())}`, { align: 'center' });

      if (data.preparedBy) {
        doc.text(`Przygotował: ${data.preparedBy}`, { align: 'center' });
      }

      let yPos = 200;

      // ===== SEKCJA: REKOMENDACJE =====
      doc.fontSize(16)
        .fillColor(COLORS.primary)
        .font('Roboto-Bold')
        .text('Rekomendacje', 50, yPos);

      yPos += 30;

      // Tabela z rekomendacjami
      const recomTable = [
        ['Parametr', 'Wartość'],
        ['Pojemność magazynu', `${data.recommendedCapacityMwh.toFixed(2)} MWh`],
        ['Moc magazynu', `${data.recommendedPowerMw.toFixed(2)} MW`],
      ];

      drawTable(doc, recomTable, 50, yPos, 495, COLORS);
      yPos += recomTable.length * 25 + 30;

      // ===== SEKCJA: PARAMETRY SYMULACJI =====
      doc.fontSize(16)
        .fillColor(COLORS.primary)
        .font('Roboto-Bold')
        .text('Parametry Symulacji', 50, yPos);

      yPos += 30;

      // Tabela z parametrami
      const paramsTable = [
        ['Parametr', 'Wartość'],
        ['Liczba cykli dziennie', data.maxCyclesPerDay.toString()],
        ['Próg opłacalności', `${data.minSpreadPlnMwh} PLN/MWh`],
        ['SoC min', `${(data.socMin * 100).toFixed(0)}%`],
        ['SoC max', `${(data.socMax * 100).toFixed(0)}%`],
        ['Efektywność', `${(data.efficiency * 100).toFixed(0)}%`],
        ['Koszty dystrybucji', `${data.distributionCostPlnMwh} PLN/MWh`],
      ];

      drawTable(doc, paramsTable, 50, yPos, 495, COLORS);
      yPos += paramsTable.length * 25 + 30;

      // Stopka
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(9)
          .fillColor(COLORS.lightText)
          .font('Roboto')
          .text(
            `Strona ${i + 1} z ${pageCount}`,
            50,
            doc.page.height - 50,
            { align: 'center', width: doc.page.width - 100 }
          );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Funkcja pomocnicza do rysowania tabeli
function drawTable(
  doc: PDFKit.PDFDocument,
  data: string[][],
  x: number,
  y: number,
  width: number,
  colors: typeof COLORS
) {
  const rowHeight = 25;
  const colWidth = width / 2;

  data.forEach((row, rowIndex) => {
    const isHeader = rowIndex === 0;
    const rowY = y + rowIndex * rowHeight;

    // Tło nagłówka
    if (isHeader) {
      doc.save();
      doc.fillColor(colors.primary).opacity(0.1);
      doc.rect(x, rowY, width, rowHeight).fill();
      doc.restore();
    }

    // Linie tabeli
    doc.strokeColor(colors.gray).lineWidth(1);
    doc.rect(x, rowY, width, rowHeight).stroke();
    doc.moveTo(x + colWidth, rowY).lineTo(x + colWidth, rowY + rowHeight).stroke();

    // Tekst
    doc.fontSize(10)
      .fillColor(colors.text)
      .font(isHeader ? 'Roboto-Bold' : 'Roboto');

    row.forEach((cell, colIndex) => {
      const cellX = x + colIndex * colWidth;
      doc.text(cell, cellX + 5, rowY + 7, {
        width: colWidth - 10,
        align: colIndex === 0 ? 'left' : 'right',
      });
    });
  });
}
