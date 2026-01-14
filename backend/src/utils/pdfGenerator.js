const PDFDocument = require('pdfkit');

/**
 * Generate Invoice PDF
 * @param {Object} invoice - Invoice object
 * @param {Object} project - Project object
 * @param {Object} client - Client object
 * @returns {Promise<Buffer>} - PDF Buffer
 */
const generateInvoicePDF = (invoice, project, client) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // --- Header ---
            doc.fontSize(20).text('INVOICE', { align: 'right' });
            doc.fontSize(10).text(`Invoice Number: ${invoice.invoiceNumber || 'DRAFT'}`, { align: 'right' });
            doc.text(`Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, { align: 'right' });
            doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, { align: 'right' });

            doc.moveDown();

            // --- Company Details ---
            doc.fontSize(12).text('Houseway Company', { align: 'left' });
            // Add company address here if available
            doc.fontSize(10).text('123 Design Street', { align: 'left' });
            doc.text('Creative City, ST 12345', { align: 'left' });
            doc.text('contact@houseway.com', { align: 'left' });

            doc.moveDown();

            // --- Client Details ---
            const customerY = 130;
            doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 50, customerY);
            doc.font('Helvetica').fontSize(10);

            let currentY = customerY + 20;
            const textOptions = { align: 'left', width: 250 };

            doc.text(`${client.firstName} ${client.lastName}`, 50, currentY, textOptions);
            currentY += 15;

            if (client.company) {
                doc.text(client.company, 50, currentY, textOptions);
                currentY += 15;
            }

            // Format Address
            if (client.address) {
                if (typeof client.address === 'object') {
                    const { street, city, state, zipCode, country } = client.address;
                    if (street) {
                        doc.text(street, 50, currentY, textOptions);
                        currentY += 15;
                    }
                    if (city || state || zipCode) {
                        const line = [city, state, zipCode].filter(Boolean).join(', ');
                        doc.text(line, 50, currentY, textOptions);
                        currentY += 15;
                    }
                    if (country) {
                        doc.text(country, 50, currentY, textOptions);
                        currentY += 15;
                    }
                } else {
                    doc.text(client.address.toString(), 50, currentY, textOptions);
                    currentY += 15;
                }
            }

            doc.text(client.email, 50, currentY, textOptions);

            // --- Project Details ---
            doc.text(`Project: ${project.title}`, { align: 'left' });

            doc.moveDown(2);

            // --- Table Header ---
            const tableTop = 250;
            const itemX = 50;
            const descriptionX = 50;
            const quantityX = 300;
            const unitPriceX = 370;
            const totalX = 450;

            doc.font('Helvetica-Bold');
            doc.text('Description', descriptionX, tableTop);
            doc.text('Quantity', quantityX, tableTop);
            doc.text('Unit Price', unitPriceX, tableTop);
            doc.text('Total', totalX, tableTop);
            doc.font('Helvetica');

            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

            // --- Table Rows ---
            let y = tableTop + 25;

            invoice.lineItems.forEach(item => {
                doc.text(item.description, descriptionX, y);
                doc.text(item.quantity.toString(), quantityX, y);
                doc.text(item.unitPrice.toFixed(2), unitPriceX, y);
                doc.text(item.total.toFixed(2), totalX, y);
                y += 20;
            });

            doc.moveTo(50, y).lineTo(550, y).stroke();
            y += 10;

            // --- Totals ---
            doc.text('Subtotal:', 370, y, { align: 'right', width: 80 });
            doc.text(invoice.subtotal.toFixed(2), totalX, y);
            y += 15;

            if (invoice.taxAmount > 0) {
                doc.text(`Tax (${invoice.taxRate}%):`, 370, y, { align: 'right', width: 80 });
                doc.text(invoice.taxAmount.toFixed(2), totalX, y);
                y += 15;
            }

            if (invoice.discountAmount > 0) {
                doc.text('Discount:', 370, y, { align: 'right', width: 80 });
                doc.text(`-${invoice.discountAmount.toFixed(2)}`, totalX, y);
                y += 15;
            }

            doc.font('Helvetica-Bold');
            doc.text('Total:', 370, y, { align: 'right', width: 80 });
            doc.text(invoice.totalAmount.toFixed(2), totalX, y);
            doc.font('Helvetica');

            // --- Footer ---
            doc.moveDown(4);
            if (invoice.notes) {
                doc.fontSize(10).text('Notes:', { underline: true });
                doc.text(invoice.notes);
            }

            if (invoice.paymentTerms) {
                doc.moveDown();
                doc.text('Payment Terms:', { underline: true });
                doc.text(invoice.paymentTerms);
            }

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateInvoicePDF };
