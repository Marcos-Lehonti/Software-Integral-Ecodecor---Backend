const PDFDocument = require('pdfkit');

const fs = require('fs');

const path = require('path');

const {
  Quotation,
  QuotationItem,
  Product,
  User,
} = require('../models');

const { transporter } = require('../config/mailer');

const logger = require('../logger');


// ======================================================
// PALETA DE COLORES
// ======================================================

const COLOR = {
  primary: '#16A34A',
  primaryDark: '#15803D',
  primaryLight: '#DCFCE7',
  white: '#FFFFFF',
  black: '#111827',
  gray: '#6B7280',
  grayBorder: '#E5E7EB',
  grayMid: '#D1D5DB',
};


// ======================================================
// LAYOUT
// ======================================================

const M = 50;
const PAGE_W = 595.28;
const CONTENT = PAGE_W - M * 2;


// ======================================================
// HELPERS
// ======================================================

function drawSectionTitle(doc, text) {

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(COLOR.primary)
    .text(text, M, doc.y, {
      width: CONTENT,
    });

  const lineY = doc.y + 2;

  doc
    .moveTo(M, lineY)
    .lineTo(M + CONTENT, lineY)
    .strokeColor(COLOR.primary)
    .lineWidth(1.5)
    .stroke();

  doc.moveDown(0.8);
}

function drawDataRow(doc, label, value) {

  const labelW = 130;

  const valueW = CONTENT - labelW;

  const y = doc.y;

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(COLOR.gray)
    .text(label, M, y, {
      width: labelW,
    });

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLOR.black)
    .text(value || '-', M + labelW, y, {
      width: valueW,
    });

  doc.moveDown(0.4);
}


// ======================================================
// ENVIAR PDF POR EMAIL
// ======================================================

exports.sendQuotationPdfEmail = async (req, res) => {

  try {

    // ==================================================
    // BUSCAR COTIZACIÓN
    // ==================================================

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
      return res.status(404).json({
        message: 'Cotización no encontrada',
      });
    }

    // ==================================================
    // VALIDAR EMAIL
    // ==================================================

    if (!quotation.clientEmail) {
      return res.status(400).json({
        message: 'La cotización no tiene email',
      });
    }

    // ==================================================
    // CREAR CARPETA TEMP
    // ==================================================

    const tempDir = path.join(__dirname, '../temp');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // ==================================================
    // RUTA PDF
    // ==================================================

    const pdfPath = path.join(
      tempDir,
      `${quotation.quotationNumber}.pdf`
    );

    // ==================================================
    // CREAR PDF
    // ==================================================

    const doc = new PDFDocument({
      margin: M,
      size: 'A4',
    });

    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    // ==================================================
    // HEADER
    // ==================================================

    const HEADER_H = 110;

    doc.rect(0, 0, PAGE_W, HEADER_H)
      .fill(COLOR.primary);

    doc.rect(0, HEADER_H - 8, PAGE_W, 8)
      .fill(COLOR.primaryDark);

    doc
      .fillColor(COLOR.white)
      .font('Helvetica-Bold')
      .fontSize(26)
      .text('ECODECOR', M, 28);

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLOR.white)
      .text('Avenida Banzer, Edificio Macororo', M, 60)
      .text('Santa Cruz de la Sierra — Bolivia', M, 73);

    doc
      .fillColor(COLOR.white)
      .font('Helvetica-Bold')
      .fontSize(22)
      .text('COTIZACIÓN', 0, 28, {
        align: 'right',
        width: PAGE_W - M,
      });

    doc
      .font('Helvetica')
      .fontSize(11)
      .text(quotation.quotationNumber, 0, 56, {
        align: 'right',
        width: PAGE_W - M,
      });

    doc
      .fontSize(9)
      .text(
        `Fecha: ${new Date(
          quotation.createdAt
        ).toLocaleDateString('es-BO')}`,
        0,
        73,
        {
          align: 'right',
          width: PAGE_W - M,
        }
      );

    doc.y = HEADER_H + 22;


    // ==================================================
    // CLIENTE
    // ==================================================

    drawSectionTitle(doc, 'DATOS DEL CLIENTE');

    drawDataRow(doc, 'Cliente:', quotation.clientName);

    drawDataRow(doc, 'Empresa:', quotation.clientCompany);

    drawDataRow(doc, 'Email:', quotation.clientEmail);

    drawDataRow(doc, 'Teléfono:', quotation.clientPhone);

    drawDataRow(doc, 'Asesor:', quotation.advisor?.name);

    doc.moveDown(1);


    // ==================================================
    // PRODUCTOS
    // ==================================================

    drawSectionTitle(doc, 'PRODUCTOS');

    const cols = [
      { w: 180, label: 'Producto' },
      { w: 70, label: 'Cantidad' },
      { w: 100, label: 'Precio Unit.' },
      { w: 100, label: 'Subtotal' },
    ];

    const ROW_H = 24;

    const tableTop = doc.y;

    let curX = M;

    // HEADER TABLA

    doc
      .rect(M, tableTop, CONTENT, ROW_H)
      .fill(COLOR.primary);

    cols.forEach((col) => {

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(COLOR.white)
        .text(
          col.label,
          curX + 5,
          tableTop + 8,
          {
            width: col.w - 10,
          }
        );

      curX += col.w;
    });

    // FILAS

    quotation.items.forEach((item, idx) => {

      const rowY =
        tableTop + ROW_H + idx * ROW_H;

      const isEven = idx % 2 === 0;

      doc
        .rect(M, rowY, CONTENT, ROW_H)
        .fill(
          isEven
            ? COLOR.primaryLight
            : COLOR.white
        );

      const cells = [
        item.product?.name || '-',
        String(item.quantity),
        `Bs. ${parseFloat(item.unitPrice).toFixed(2)}`,
        `Bs. ${parseFloat(item.subtotal).toFixed(2)}`,
      ];

      curX = M;

      cells.forEach((cell, ci) => {

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(COLOR.black)
          .text(
            cell,
            curX + 5,
            rowY + 8,
            {
              width: cols[ci].w - 10,
            }
          );

        curX += cols[ci].w;
      });
    });

    const totalRows =
      1 + quotation.items.length;

    doc
      .rect(
        M,
        tableTop,
        CONTENT,
        totalRows * ROW_H
      )
      .strokeColor(COLOR.grayMid)
      .lineWidth(0.8)
      .stroke();

    doc.y =
      tableTop + totalRows * ROW_H + 30;


    // ==================================================
    // TOTAL
    // ==================================================

    drawSectionTitle(doc, 'RESUMEN');

    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(COLOR.primary)
      .text(
        `TOTAL: Bs. ${parseFloat(
          quotation.total || 0
        ).toFixed(2)}`,
        M,
        doc.y,
        {
          align: 'right',
          width: CONTENT,
        }
      );

    doc.moveDown(3);


    // ==================================================
    // FOOTER
    // ==================================================

    doc
      .moveTo(M, doc.y)
      .lineTo(M + CONTENT, doc.y)
      .strokeColor(COLOR.grayMid)
      .stroke();

    doc.moveDown();

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLOR.gray)
      .text(
        'Documento generado automáticamente por ECODECOR',
        M,
        doc.y,
        {
          align: 'center',
          width: CONTENT,
        }
      );

    // ==================================================
    // FINALIZAR PDF
    // ==================================================

    doc.end();

    // ==================================================
    // ESPERAR PDF
    // ==================================================

    stream.on('finish', async () => {

      try {

        // ==============================================
        // ENVIAR EMAIL
        // ==============================================

        await transporter.sendMail({

          from: `"ECODECOR" <${process.env.EMAIL_USER}>`,

          to: quotation.clientEmail,

          subject: `Cotización ${quotation.quotationNumber}`,

          html: `
            <h2>Hola ${quotation.clientName}</h2>

            <p>
              Adjuntamos su cotización en PDF.
            </p>

            <p>
              Gracias por confiar en ECODECOR.
            </p>
          `,

          attachments: [
            {
              filename: `${quotation.quotationNumber}.pdf`,
              path: pdfPath,
            },
          ],
        });

        // ==============================================
        // BORRAR PDF
        // ==============================================

        fs.unlinkSync(pdfPath);

        logger.info(
          `📧 Cotización enviada a ${quotation.clientEmail}`
        );

        return res.json({
          message: 'Cotización enviada correctamente',
        });

      } catch (err) {

        logger.error(
          `❌ Error enviando email: ${err.message}`
        );

        return res.status(500).json({
          message: 'Error enviando email',
        });
      }
    });

  } catch (err) {

    logger.error(
      `❌ sendQuotationPdfEmail: ${err.message}`
    );

    return res.status(500).json({
      message: 'Error enviando cotización',
    });
  }
};