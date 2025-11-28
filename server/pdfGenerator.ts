import path from "path";
import PDFDocument from "pdfkit";



interface CalculationData {
  name: string;
  createdAt: Date;
  preparedBy?: string;

  // Parametry
  maxCyclesPerDay: number;
  minSpreadPlnMwh: number;
  capacityMwh: number;
  powerMw: number;
  socMin: number;
  socMax: number;
  efficiency: number;
  distributionCostPlnMwh: number;

  // KPI
  avgCyclesPerDay: number;
  avgSpreadPerCyclePln: number;
  effectiveAvgSpreadPlnMwh: number;
  totalEnergyBoughtMwh: number;
  totalEnergySoldMwh: number;
  energyLossMwh: number;
  totalRevenuePln: number;

  // Wyniki finansowe
  revenuePln: number;
  distributionCostPln: number;
  profitPln: number;

  // Dane miesięczne
  monthlyData?: Array<{
    month: string;
    cycleCount: number;
    revenue: number;
    distributionCost: number;
    profit: number;
  }>;

  // Metadane RDN
  rdnDataStartDate?: Date;
  rdnDataEndDate?: Date;

  // Dane godzinowe
  hourlyAverages?: Array<{
    hour: number;
    avgPrice: number;
    isCharging: boolean;
    isDischarging: boolean;
  }>;
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

export async function generatePDFReport(data: CalculationData): Promise<Buffer> {
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
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
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
        .text('Symulacja Rentowności Magazynu Energii', 50, 100, { align: 'center' });

      doc.fontSize(12)
        .fillColor(COLORS.lightText)
        .font('Roboto')
        .text(data.name, { align: 'center' });

      doc.text(`Data wygenerowania: ${new Date().toLocaleDateString('pl-PL')}`, { align: 'center' });

      if (data.preparedBy) {
        doc.text(`Przygotował: ${data.preparedBy}`, { align: 'center' });
      }

      if (data.rdnDataStartDate && data.rdnDataEndDate) {
        // Formatowanie dat bez problemów ze strefą czasową - używamy UTC
        const formatDate = (date: Date) => {
          const d = new Date(date);
          const day = d.getUTCDate().toString().padStart(2, '0');
          const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
          const year = d.getUTCFullYear();
          return `${day}.${month}.${year}`;
        };

        doc.text(
          `Symulacja bazuje na danych RDN za okres: ${formatDate(data.rdnDataStartDate)} - ${formatDate(data.rdnDataEndDate)}`,
          { align: 'center' }
        );
      }

      doc.moveDown(2);

      let yPosition = doc.y;

      // Sekcja 1: Parametry magazynu
      doc.fontSize(16)
        .fillColor(COLORS.primary)
        .font('Roboto-Bold')
        .text('Parametry Magazynu', 50, yPosition);

      yPosition += 25;

      const params = [
        { label: 'Pojemność magazynu', value: `${data.capacityMwh.toFixed(2)} MWh` },
        { label: 'Moc magazynu', value: `${data.powerMw.toFixed(2)} MW` },
        { label: 'SoC min', value: `${(data.socMin * 100).toFixed(0)}%` },
        { label: 'SoC max', value: `${(data.socMax * 100).toFixed(0)}%` },
        { label: 'Efektywność cyklu', value: `${(data.efficiency * 100).toFixed(0)}%` },
        { label: 'Liczba cykli dziennie', value: data.maxCyclesPerDay.toString() },
        { label: 'Próg opłacalności', value: `${data.minSpreadPlnMwh.toFixed(2)} PLN/MWh` },
        { label: 'Koszty dystrybucji', value: `${data.distributionCostPlnMwh.toFixed(2)} PLN/MWh` },
      ];

      // Rysowanie tabeli dla parametrów
      const tableX = 50;
      const tableWidth = 495;
      const col1Width = 250;
      const col2Width = tableWidth - col1Width;
      const rowHeight = 25;

      doc.fontSize(10).fillColor(COLORS.text).font('Roboto');

      // Nagłówek tabeli
      doc.rect(tableX, yPosition, col1Width, rowHeight).stroke(COLORS.gray);
      doc.rect(tableX + col1Width, yPosition, col2Width, rowHeight).stroke(COLORS.gray);
      doc.font('Roboto-Bold')
        .text('Parametr', tableX + 5, yPosition + 7, { width: col1Width - 10 })
        .text('Wartość', tableX + col1Width + 5, yPosition + 7, { width: col2Width - 10 });

      yPosition += rowHeight;

      // Wiersze tabeli
      params.forEach((param) => {
        doc.rect(tableX, yPosition, col1Width, rowHeight).stroke(COLORS.gray);
        doc.rect(tableX + col1Width, yPosition, col2Width, rowHeight).stroke(COLORS.gray);

        doc.font('Roboto')
          .text(param.label, tableX + 5, yPosition + 7, { width: col1Width - 10 })
          .text(param.value, tableX + col1Width + 5, yPosition + 7, { width: col2Width - 10 });

        yPosition += rowHeight;
      });

      yPosition += 10;

      // Sekcja 2: Wskaźniki KPI
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(16)
        .fillColor(COLORS.primary)
        .font('Roboto-Bold')
        .text('Wskaźniki KPI', 50, yPosition);

      yPosition += 25;

      const kpis = [
        { label: 'Średnia dzienna liczba cykli', value: data.avgCyclesPerDay.toFixed(2) },
        { label: 'Średni spread na cykl', value: `${data.avgSpreadPerCyclePln.toFixed(2)} PLN` },
        { label: 'Efektywny Średni spread', value: `${data.effectiveAvgSpreadPlnMwh.toFixed(2)} PLN/MWh` },
        { label: 'Suma energii kupionej', value: `${data.totalEnergyBoughtMwh.toFixed(2)} MWh` },
        { label: 'Suma energii sprzedanej', value: `${data.totalEnergySoldMwh.toFixed(2)} MWh` },
        { label: 'Energia zużyta na sprawność', value: `${data.energyLossMwh.toFixed(2)} MWh` },
        { label: 'Łączne przychody', value: `${data.totalRevenuePln.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN` },
      ];

      doc.fontSize(10).fillColor(COLORS.text).font('Roboto');

      // Nagłówek tabeli KPI
      doc.rect(tableX, yPosition, col1Width, rowHeight).stroke(COLORS.gray);
      doc.rect(tableX + col1Width, yPosition, col2Width, rowHeight).stroke(COLORS.gray);
      doc.font('Roboto-Bold')
        .text('Wskaźnik', tableX + 5, yPosition + 7, { width: col1Width - 10 })
        .text('Wartość', tableX + col1Width + 5, yPosition + 7, { width: col2Width - 10 });

      yPosition += rowHeight;

      // Wiersze tabeli KPI
      kpis.forEach((kpi) => {
        doc.rect(tableX, yPosition, col1Width, rowHeight).stroke(COLORS.gray);
        doc.rect(tableX + col1Width, yPosition, col2Width, rowHeight).stroke(COLORS.gray);

        doc.font('Roboto')
          .text(kpi.label, tableX + 5, yPosition + 7, { width: col1Width - 10 })
          .text(kpi.value, tableX + col1Width + 5, yPosition + 7, { width: col2Width - 10 });

        yPosition += rowHeight;
      });

      yPosition += 10;

      // Sekcja 3: Wyniki finansowe
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(16)
        .fillColor(COLORS.primary)
        .font('Roboto-Bold')
        .text('Symulacja Wyniku Finansowego', 50, yPosition);

      yPosition += 25;

      // Prostokąty z wynikami
      const boxWidth = 150;
      const boxHeight = 80;
      const boxSpacing = 20;

      const financialBoxes = [
        { label: 'Przychody', value: data.revenuePln, color: '#10b981' },
        { label: 'Koszty dystrybucji', value: data.distributionCostPln, color: '#ef4444' },
        { label: 'Zysk netto', value: data.profitPln, color: COLORS.primary },
      ];

      financialBoxes.forEach((box, index) => {
        const x = 50 + index * (boxWidth + boxSpacing);

        // Tło prostokąta z przezroczystością
        doc.save();
        doc.fillOpacity(0.1)
          .rect(x, yPosition, boxWidth, boxHeight)
          .fill(box.color);
        doc.restore();

        // Etykieta
        doc.fontSize(10)
          .fillColor(COLORS.lightText)
          .font('Roboto')
          .text(box.label, x + 10, yPosition + 15, { width: boxWidth - 20, align: 'center' });

        // Wartość
        doc.fontSize(18)
          .fillColor(box.color)
          .font('Roboto-Bold')
          .text(
            box.value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' PLN',
            x + 10,
            yPosition + 40,
            { width: boxWidth - 20, align: 'center' }
          );
      });

      yPosition += boxHeight + 40;

      // Sekcja 4: Dane miesięczne (jeśli dostępne)
      if (data.monthlyData && data.monthlyData.length > 0) {
        if (yPosition > 600) {
          doc.addPage();
          yPosition = 50;
        }

        doc.fontSize(16)
          .fillColor(COLORS.primary)
          .font('Roboto-Bold')
          .text('Symulacja Wyników Miesięcznych', 50, yPosition);

        yPosition += 25;

        // Nagłówki tabeli
        const tableTop = yPosition;
        const colWidths = [80, 80, 100, 100, 100];
        const colX = [50, 130, 210, 310, 410];
        const headers = ['Miesiąc', 'Liczba cykli', 'Przychody (PLN)', 'Koszty (PLN)', 'Zysk (PLN)'];

        doc.fontSize(9)
          .fillColor(COLORS.primary)
          .font('Roboto-Bold');

        headers.forEach((header, i) => {
          doc.text(header, colX[i], tableTop, { width: colWidths[i], align: 'left' });
        });

        yPosition = tableTop + 20;

        // Linia pod nagłówkami
        doc.moveTo(50, yPosition).lineTo(510, yPosition).stroke(COLORS.gray);
        yPosition += 5;

        // Wiersze danych
        doc.fontSize(9)
          .fillColor(COLORS.text)
          .font('Roboto');

        data.monthlyData.forEach((row, index) => {
          if (yPosition > 750) {
            doc.addPage();
            yPosition = 50;
          }

          const rowY = yPosition + index * 18;

          doc.text(row.month, colX[0], rowY, { width: colWidths[0] });
          doc.text(row.cycleCount.toString(), colX[1], rowY, { width: colWidths[1] });
          doc.text(row.revenue.toLocaleString('pl-PL', { minimumFractionDigits: 2 }), colX[2], rowY, { width: colWidths[2] });
          doc.text(row.distributionCost.toLocaleString('pl-PL', { minimumFractionDigits: 2 }), colX[3], rowY, { width: colWidths[3] });
          doc.text(row.profit.toLocaleString('pl-PL', { minimumFractionDigits: 2 }), colX[4], rowY, { width: colWidths[4] });
        });

        // Wiersz podsumowania
        const summaryY = yPosition + data.monthlyData.length * 18 + 10;

        // Linia nad podsumowaniem
        doc.moveTo(50, summaryY - 5).lineTo(510, summaryY - 5).strokeColor(COLORS.primary).lineWidth(2).stroke();

        // Obliczenie sum
        const totalCycles = data.monthlyData.reduce((sum, row) => sum + row.cycleCount, 0);
        const totalRevenue = data.monthlyData.reduce((sum, row) => sum + row.revenue, 0);
        const totalCost = data.monthlyData.reduce((sum, row) => sum + row.distributionCost, 0);
        const totalProfit = data.monthlyData.reduce((sum, row) => sum + row.profit, 0);

        doc.fontSize(9)
          .fillColor(COLORS.text)
          .font('Roboto-Bold');

        doc.text('Suma', colX[0], summaryY, { width: colWidths[0] });
        doc.text(totalCycles.toString(), colX[1], summaryY, { width: colWidths[1] });
        doc.text(totalRevenue.toLocaleString('pl-PL', { minimumFractionDigits: 2 }), colX[2], summaryY, { width: colWidths[2] });
        doc.text(totalCost.toLocaleString('pl-PL', { minimumFractionDigits: 2 }), colX[3], summaryY, { width: colWidths[3] });
        doc.text(totalProfit.toLocaleString('pl-PL', { minimumFractionDigits: 2 }), colX[4], summaryY, { width: colWidths[4] });
      }

      // Stopka na ostatniej stronie
      doc.fontSize(8)
        .fillColor(COLORS.lightText)
        .font('Roboto')
        .text(
          'Wygenerowano przez Symulator Rentowności Magazynu Energii - Ekovoltis',
          50,
          doc.page.height - 30,
          { align: 'center', width: doc.page.width - 100 }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
