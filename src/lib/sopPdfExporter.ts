import { SopModule } from '../types/sop';
import { SystemConfigService } from '../domain/SystemConfigService';

export const SopPdfExporter = {
  /**
   * Ekspor modul SOP menjadi lembar Cheatsheet / Poster A4 PDF resmi
   */
  async exportSopPosterPDF(module: SopModule): Promise<void> {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let currentY = 0;

    // ─── 1. HEADER KORPORAT ───
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Accent line
    doc.setFillColor(147, 51, 234); // purple-600
    doc.rect(0, 28, pageWidth, 2, 'F');

    // Title text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PT. DAYA ANUGRAH MULYA — STANDAR OPERASIONAL PROSEDUR', margin, 12);

    const docNumber = SystemConfigService.generateDocumentNumber('sop', { code: module.code });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`LEMBAR POSTER RESMI • NO. DOKUMEN: ${docNumber} • VERSI ${module.version || 'v1.0'}`, margin, 18);
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - margin - 40, 18);

    currentY = 36;

    // ─── 2. INFO MODUL BOX ───
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 24, 2, 2, 'FD');

    // Code Badge
    doc.setFillColor(88, 28, 135);
    doc.roundedRect(margin + 4, currentY + 4, 26, 7, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(module.code, margin + 6, currentY + 9);

    // Title
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(module.title, margin + 34, currentY + 9);

    // Metadata details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const metaLine = `Kategori: ${module.category}  |  Target Divisi: ${module.targetDivisions.join(', ')}  |  Role: ${module.targetRoles.join(', ')}  |  Tingkat: ${module.difficulty}`;
    doc.text(metaLine, margin + 4, currentY + 18);

    currentY += 30;

    // ─── 3. RINGKASAN DESKRIPSI ───
    if (module.description) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('I. TUJUAN & RUANG LINGKUP PROSEDUR', margin, currentY);
      currentY += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const splitDesc = doc.splitTextToSize(module.description, pageWidth - (margin * 2));
      doc.text(splitDesc, margin, currentY);
      currentY += (splitDesc.length * 4) + 4;
    }

    // ─── 4. LANGKAH-LANGKAH OPERASIONAL (STEP TABLE) ───
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('II. TAHAPAN & INSTRUKSI KERJA STANDAR (SOP)', margin, currentY);
    currentY += 3;

    // Extract all steps from slides
    const allSteps: { stepNum: number; title: string; desc: string; highlight: string }[] = [];
    module.slides.forEach((sl) => {
      if (sl.steps && sl.steps.length > 0) {
        sl.steps.forEach((st) => {
          allSteps.push({
            stepNum: st.stepNumber,
            title: st.title,
            desc: st.description,
            highlight: st.keyHighlight || '-',
          });
        });
      } else if (sl.slideType === 'interactive_simulator') {
        allSteps.push({
          stepNum: sl.slideNumber,
          title: sl.title,
          desc: sl.subtitle || 'Pastikan koordinasi akurat pada layar handheld WMS scanner.',
          highlight: sl.simulatorConfig?.highlightLabel || sl.simulatorConfig?.taskInstruction || 'Konfirmasi Sistem',
        });
      } else if (sl.slideType === 'spot_the_mistake') {
        allSteps.push({
          stepNum: sl.slideNumber,
          title: sl.title,
          desc: sl.subtitle || 'Identifikasi dan laporkan anomali atau bahaya K3 di lokasi kerja.',
          highlight: sl.spotMistakeConfig?.hazardName || sl.spotMistakeConfig?.challengePrompt || 'Inspeksi Visual',
        });
      }
    });

    const stepRows = allSteps.map((s) => [
      `Langkah ${s.stepNum}`,
      s.title,
      s.desc,
      s.highlight,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['No', 'Uraian Aktivitas', 'Instruksi Detail', 'Poin Kritis / Highlight']],
      body: stepRows.length > 0 ? stepRows : [['1', 'Patuhi Prosedur', module.description || '-', 'Wajib APD Lengkap']],
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold' },
        1: { cellWidth: 40, fontStyle: 'bold' },
        2: { cellWidth: 80 },
        3: { cellWidth: 42, textColor: [16, 185, 129], fontStyle: 'bold' },
      },
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 8;

    // ─── 5. DOS & DON'TS MATRIX TABLE ───
    const dosAndDontsList: { doTitle: string; doText: string; dontTitle: string; dontText: string }[] = [];
    module.slides.forEach((sl) => {
      if (sl.dosAndDonts && sl.dosAndDonts.length > 0) {
        sl.dosAndDonts.forEach((dd) => {
          dosAndDontsList.push({
            doTitle: dd.doTitle,
            doText: dd.doText,
            dontTitle: dd.dontTitle,
            dontText: dd.dontText,
          });
        });
      }
    });

    if (dosAndDontsList.length > 0 && currentY < pageHeight - 50) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('III. PEDOMAN DOs & DONTs (PRAKTIK BENAR VS LARANGAN)', margin, currentY);
      currentY += 3;

      const ddRows = dosAndDontsList.map((d) => [
        `✓ ${d.doTitle}\n${d.doText}`,
        `✗ ${d.dontTitle}\n${d.dontText}`,
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['DO — Praktik Benar & Disarankan', 'DONT — Larangan Mutlak K3']],
        body: ddRows,
        margin: { left: margin, right: margin },
        headStyles: {
          fillColor: [16, 185, 129], // emerald
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 91 },
          1: { cellWidth: 91, textColor: [225, 29, 72] }, // rose-600
        },
      });

      // @ts-ignore
      currentY = doc.lastAutoTable.finalY + 8;
    }

    // ─── 6. FOOTER PROTOKOL K3 RESMI ───
    const footerY = pageHeight - 18;
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, footerY - 4, pageWidth - (margin * 2), 16, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('GOLDEN RULES K3 LOGISTIK:', margin + 3, footerY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('1. Wajib APD lengkap sebelum masuk area kerja  |  2. Kecepatan MHE maks 10 km/h  |  3. Laporkan insiden/near-miss ke Supervisor segera.', margin + 3, footerY + 4);
    doc.text('Lembar Dokumen Sah PT. DAYA ANUGRAH MULYA • Dilarang menggandakan tanpa otorisasi HSE/Ops', margin + 3, footerY + 8);

    // Save File
    doc.save(`POSTER_SOP_${module.code.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
  },
};
