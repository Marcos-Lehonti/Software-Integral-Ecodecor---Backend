const PDFDocument = require('pdfkit');

const {
  Quotation,
  QuotationItem,
  Product,
  User,
} = require('../models');

const logger = require('../logger');

// ======================================================
// PALETA DE COLORES
// ======================================================

const COLOR = {
  primary:     '#16A34A', // verde principal
  primaryDark: '#15803D', // verde oscuro
  primaryLight:'#DCFCE7', // verde muy claro (fondo filas alternas)
  white:       '#FFFFFF',
  black:       '#111827',
  gray:        '#6B7280',
  grayLight:   '#F9FAFB',
  grayBorder:  '#E5E7EB',
  grayMid:     '#D1D5DB',
};

// ======================================================
// MÁRGENES Y LAYOUT
// ======================================================

const M        = 50;          // margen izquierdo/derecho
const PAGE_W   = 595.28;      // A4 ancho en puntos
const CONTENT  = PAGE_W - M * 2;  // 495.28 — ancho útil


// ======================================================
// HELPERS
// ======================================================

/**
 * Dibuja una sección con título y línea verde inferior.
 */
function drawSectionTitle(doc, text) {
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(COLOR.primary)
    .text(text, M, doc.y, { width: CONTENT });

  const lineY = doc.y + 2;
  doc
    .moveTo(M, lineY)
    .lineTo(M + CONTENT, lineY)
    .strokeColor(COLOR.primary)
    .lineWidth(1.5)
    .stroke();

  doc.moveDown(0.8);
}


/**
 * Dibuja una fila de dato: etiqueta en bold + valor normal.
 */
function drawDataRow(doc, label, value) {
  const labelW = 130;
  const valueW = CONTENT - labelW;
  const y = doc.y;

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(COLOR.gray)
    .text(label, M, y, { width: labelW, continued: false });

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLOR.black)
    .text(value || '-', M + labelW, y, { width: valueW });

  doc.moveDown(0.4);
}


// ======================================================
// GENERAR PDF DE COTIZACIÓN
// GET /api/quotation-pdf/:id/pdf
// ======================================================

exports.generateQuotationPdf = async (req, res) => {

  try {

    // ──────────────────────────────────────────────────
    // BUSCAR COTIZACIÓN
    // ──────────────────────────────────────────────────

    const quotation = await Quotation.findByPk(
      req.params.id,
      {
        include: [
          {
            model: QuotationItem,
            as: 'items',
            include: [{ model: Product, as: 'product' }],
          },
          {
            model: User,
            as: 'advisor',
            attributes: ['id', 'name', 'email'],
          },
        ],
      }
    );

    if (!quotation) {
      return res.status(404).json({ message: 'Cotización no encontrada' });
    }


    // ──────────────────────────────────────────────────
    // HEADERS HTTP
    // ──────────────────────────────────────────────────

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=${quotation.quotationNumber}.pdf`
    );


    // ──────────────────────────────────────────────────
    // CREAR DOCUMENTO
    // ──────────────────────────────────────────────────

    const doc = new PDFDocument({ margin: M, size: 'A4' });
    doc.pipe(res);


    // ══════════════════════════════════════════════════
    // HEADER PRINCIPAL
    // ══════════════════════════════════════════════════

    const HEADER_H = 110;

    // Fondo verde header
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(COLOR.primary);

    // Franja inferior decorativa más oscura
    doc.rect(0, HEADER_H - 8, PAGE_W, 8).fill(COLOR.primaryDark);

    // Nombre empresa
    doc
      .fillColor(COLOR.white)
      .font('Helvetica-Bold')
      .fontSize(26)
      .text('ECODECOR', M, 28);

    // Dirección empresa
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('rgba(255,255,255,0.85)')
      .text('Avenida Banzer, Edificio Macororo', M, 60)
      .text('Santa Cruz de la Sierra — Bolivia', M, 73);

    // Título COTIZACIÓN (derecha)
    doc
      .fillColor(COLOR.white)
      .font('Helvetica-Bold')
      .fontSize(22)
      .text('COTIZACIÓN', 0, 28, { align: 'right', width: PAGE_W - M });

    // Número cotización (derecha)
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('rgba(255,255,255,0.9)')
      .text(quotation.quotationNumber, 0, 56, {
        align: 'right',
        width: PAGE_W - M,
      });

    // Fecha (derecha)
    doc
      .fontSize(9)
      .text(
        `Fecha: ${new Date(quotation.createdAt).toLocaleDateString('es-BO')}`,
        0,
        73,
        { align: 'right', width: PAGE_W - M }
      );

    doc.y = HEADER_H + 22;


    // ══════════════════════════════════════════════════
    // DATOS CLIENTE  +  INFORMACIÓN PROYECTO  (2 columnas)
    // ══════════════════════════════════════════════════

    const colHalf = (CONTENT - 20) / 2;
    const col1X   = M;
    const col2X   = M + colHalf + 20;
    const twoColY = doc.y;

    // ── Columna 1: Cliente ──
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COLOR.primary)
      .text('DATOS DEL CLIENTE', col1X, twoColY, { width: colHalf });

    doc
      .moveTo(col1X, doc.y + 2)
      .lineTo(col1X + colHalf, doc.y + 2)
      .strokeColor(COLOR.primary)
      .lineWidth(1)
      .stroke();

    let leftY = doc.y + 10;

    const clientRows = [
      ['Cliente',  quotation.clientName],
      ['Empresa',  quotation.clientCompany],
      ['Teléfono', quotation.clientPhone],
      ['Email',    quotation.clientEmail],
    ];

    clientRows.forEach(([lbl, val]) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(COLOR.gray)
        .text(lbl, col1X, leftY, { width: 65 });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLOR.black)
        .text(val || '-', col1X + 68, leftY, { width: colHalf - 68 });

      leftY += 16;
    });


    // ── Columna 2: Proyecto ──
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COLOR.primary)
      .text('INFORMACIÓN DEL PROYECTO', col2X, twoColY, { width: colHalf });

    doc
      .moveTo(col2X, doc.y + 2)
      .lineTo(col2X + colHalf, doc.y + 2)
      .strokeColor(COLOR.primary)
      .lineWidth(1)
      .stroke();

    let rightY = doc.y + 10;

    const projectRows = [
      ['Tipo',      quotation.projectType],
      ['Duración',  quotation.workDuration],
      ['Estado',    quotation.status],
      ['Válida hasta', new Date(quotation.validUntil).toLocaleDateString('es-BO')],
      ['Asesor',    quotation.advisor?.name],
    ];

    projectRows.forEach(([lbl, val]) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(COLOR.gray)
        .text(lbl, col2X, rightY, { width: 75 });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLOR.black)
        .text(val || '-', col2X + 78, rightY, { width: colHalf - 78 });

      rightY += 16;
    });

    // Mover cursor debajo de ambas columnas
    doc.y = Math.max(leftY, rightY) + 18;


    // ══════════════════════════════════════════════════
    // DESCRIPCIÓN DEL SERVICIO
    // ══════════════════════════════════════════════════

    if (quotation.serviceDescription) {
      drawSectionTitle(doc, 'DESCRIPCIÓN DEL SERVICIO');

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLOR.black)
        .text(quotation.serviceDescription, M, doc.y, {
          width: CONTENT,
          align: 'justify',
        });

      doc.moveDown(1.5);
    }


    // ══════════════════════════════════════════════════
    // TABLA DE PRODUCTOS
    // ══════════════════════════════════════════════════

    drawSectionTitle(doc, 'PRODUCTOS COTIZADOS');

    if (quotation.items && quotation.items.length > 0) {

      // Columnas: [ancho, título, alineación]
      const cols = [
        { w: 115, label: 'Producto',     align: 'left'  },
        { w: 55,  label: 'Código',       align: 'left'  },
        { w: 65,  label: 'Categoría',    align: 'left'  },
        { w: 60,  label: 'Almacén',      align: 'left'  },
        { w: 45,  label: 'Cant.',        align: 'right' },
        { w: 45,  label: 'Unidad',       align: 'left'  },
        { w: 55,  label: 'Precio Unit.', align: 'right' },
        { w: 55,  label: 'Subtotal',     align: 'right' },
      ];

      const ROW_H    = 22;
      const tableTop = doc.y;
      let   curX     = M;

      // ── Cabecera ──
      doc.rect(M, tableTop, CONTENT, ROW_H).fill(COLOR.primary);

      cols.forEach((col) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(COLOR.white)
          .text(col.label, curX + 4, tableTop + 7, {
            width: col.w - 8,
            align: col.align,
          });
        curX += col.w;
      });

      // ── Filas ──
      quotation.items.forEach((item, idx) => {
        const rowY  = tableTop + ROW_H + idx * ROW_H;
        const isEven = idx % 2 === 0;

        doc
          .rect(M, rowY, CONTENT, ROW_H)
          .fill(isEven ? COLOR.primaryLight : COLOR.white);

        // Línea inferior
        doc
          .moveTo(M, rowY + ROW_H)
          .lineTo(M + CONTENT, rowY + ROW_H)
          .strokeColor(COLOR.grayBorder)
          .lineWidth(0.4)
          .stroke();

        const cells = [
          { v: item.product?.name     || '-', align: 'left'  },
          { v: item.product?.code     || '-', align: 'left'  },
          { v: item.product?.category || '-', align: 'left'  },
          { v: item.warehouseName     || '-', align: 'left'  },
          { v: String(parseFloat(item.quantity || 0)),  align: 'right' },
          { v: item.product?.unit     || '-', align: 'left'  },
          { v: `Bs. ${parseFloat(item.unitPrice || 0).toFixed(2)}`, align: 'right' },
          { v: `Bs. ${parseFloat(item.subtotal  || 0).toFixed(2)}`, align: 'right' },
        ];

        curX = M;
        cells.forEach((cell, ci) => {
          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(COLOR.black)
            .text(cell.v, curX + 4, rowY + 7, {
              width: cols[ci].w - 8,
              align: cell.align,
              ellipsis: true,
            });
          curX += cols[ci].w;
        });
      });

      // Borde exterior tabla
      const totalRows = 1 + quotation.items.length;
      doc
        .rect(M, tableTop, CONTENT, totalRows * ROW_H)
        .strokeColor(COLOR.grayMid)
        .lineWidth(0.8)
        .stroke();

      // Mover cursor
      doc.y = tableTop + totalRows * ROW_H + 20;

    } else {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLOR.gray)
        .text('No existen productos registrados en esta cotización.', M, doc.y, {
          width: CONTENT,
        });
      doc.moveDown(1);
    }


    // ══════════════════════════════════════════════════
    // RESUMEN ECONÓMICO
    // ══════════════════════════════════════════════════

    doc.moveDown(0.5);
    drawSectionTitle(doc, 'RESUMEN ECONÓMICO');

    const boxW  = 220;
    const boxH  = 88;
    const boxX  = M + CONTENT - boxW;
    const boxY  = doc.y;

    // Fondo caja
    doc.roundedRect(boxX, boxY, boxW, boxH, 8).fill(COLOR.primary);

    // Línea separadora interna
    doc
      .moveTo(boxX + 16, boxY + 48)
      .lineTo(boxX + boxW - 16, boxY + 48)
      .strokeColor('rgba(255,255,255,0.35)')
      .lineWidth(0.8)
      .stroke();

    // Subtotal
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('rgba(255,255,255,0.8)')
      .text('SUBTOTAL', boxX + 16, boxY + 14, { width: boxW - 32 });

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(COLOR.white)
      .text(
        `Bs. ${parseFloat(quotation.subtotal || 0).toFixed(2)}`,
        boxX + 16,
        boxY + 26,
        { width: boxW - 32, align: 'right' }
      );

    // Total
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('rgba(255,255,255,0.8)')
      .text('TOTAL', boxX + 16, boxY + 54, { width: boxW - 32 });

    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(COLOR.white)
      .text(
        `Bs. ${parseFloat(quotation.total || 0).toFixed(2)}`,
        boxX + 16,
        boxY + 63,
        { width: boxW - 32, align: 'right' }
      );

    doc.y = boxY + boxH + 22;


    // ══════════════════════════════════════════════════
    // OBSERVACIONES
    // ══════════════════════════════════════════════════

    if (quotation.paymentTerms || quotation.termsConditions || quotation.notes) {

      drawSectionTitle(doc, 'OBSERVACIONES');

      if (quotation.paymentTerms) {
        drawDataRow(doc, 'Condiciones de pago:', quotation.paymentTerms);
      }

      if (quotation.termsConditions) {
        drawDataRow(doc, 'Términos y condiciones:', quotation.termsConditions);
      }

      if (quotation.notes) {
        drawDataRow(doc, 'Notas:', quotation.notes);
      }

      doc.moveDown(0.5);
    }


    // ══════════════════════════════════════════════════
    // FOOTER
    // ══════════════════════════════════════════════════

    doc.moveDown(2);

    // Línea footer
    doc
      .moveTo(M, doc.y)
      .lineTo(M + CONTENT, doc.y)
      .strokeColor(COLOR.grayMid)
      .lineWidth(0.8)
      .stroke();

    doc.moveDown(0.8);

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(COLOR.gray)
      .text(
        'Documento generado automáticamente por el sistema ECODECOR',
        M,
        doc.y,
        { width: CONTENT, align: 'center' }
      );

    doc
      .fontSize(8)
      .text(
        `Generado el ${new Date().toLocaleString('es-BO')}`,
        M,
        doc.y + 2,
        { width: CONTENT, align: 'center' }
      );


    // ══════════════════════════════════════════════════
    // FINALIZAR
    // ══════════════════════════════════════════════════

    doc.end();

  } catch (err) {
    logger.error(`❌ generateQuotationPdf: ${err.message}`);
    return res.status(500).json({ message: 'Error al generar PDF' });
  }
};