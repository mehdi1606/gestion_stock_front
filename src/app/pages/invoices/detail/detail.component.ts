import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { C } from '@fullcalendar/core/internal-common';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss']
})
export class DetailComponent implements OnInit {
  breadCrumbItems: Array<{}>;
  orderDetail: any;
  TotalHT:any;
  constructor(private route: ActivatedRoute) { }
  ngOnInit() {
    this.breadCrumbItems = [{ label: 'Factures' }, { label: 'Détails', active: true }];
     this.TotalHT=this.orderDetail?.totalAmount/(1+0.2);
    this.route.paramMap.subscribe(params => {
      const orderId = params.get('id');
      if (orderId) {
        this.fetchOrderDetails(orderId);
      }
    });
  }
  isDiscountable(product: any): boolean {
    // Check if the product is in the Alimentaire or Cosmétique categories
    // AND ensure it's not an Argan product
    return (product.product.category === 'Alimentaire' ||
            product.product.category === 'Cosmetique') &&
           product.product.category !== 'Argan';
  }

  calculateDiscount(product: any): number {
    // Only calculate discount if the product is discountable
    if (this.isDiscountable(product)) {
      const reductionPercentage = this.orderDetail?.reductionPercentage;

      // Calculate the discount amount
      const discount = (reductionPercentage / 100) * product.product.price;

      // Return the discount amount
      return discount;
    }

    // If not discountable, return 0 (no discount)
    return 0;
  }

  calculateTotalPriceAfterDiscount(product: any): number {
    const price = product.product.price;
    const quantity = product.quantity;

    // Only apply discount if the product is discountable
    if (this.isDiscountable(product)) {
      const reductionPercentage = this.orderDetail?.reductionPercentage;
      const discount = (reductionPercentage / 100) * price;
      const priceAfterDiscount = price - discount;
      return priceAfterDiscount * quantity;
    }

    // If not discountable (Argan products), return original price * quantity
    return price * quantity;
  }

// Method to calculate the Total amount (with or without TVA based on DocumentType)
calculateTotal(product: any): number {
  const basePrice = product.product.price;
  const quantity = product.quantity;
  const discount = this.calculateDiscount(product); // Apply discount dynamically

  // Calculate Total after discount
  const totalWithoutTVA = (basePrice - discount) * quantity;

  // If DocumentType is FACTURE, apply TVA (e.g., 20%)
  const tva = this.orderDetail?.documentType === 'FACTURE' ? totalWithoutTVA * 0.2 : 0;

  const total = totalWithoutTVA + tva; // Add TVA if applicable
  return total;
}


  fetchOrderDetails(orderId: string) {
    axios.get(`http://localhost:8044/api/orders/${orderId}`)
      .then(response => {
        this.orderDetail = response.data;
      })
      .catch(error => {
        console.error('Erreur lors de la récupération des détails de la commande:', error);
      });
  }

  downloadPDF() {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width;
    const margin = 40;

    // Color scheme
    const colors = {
      primary: { r: 34, g: 45, b: 85 },
      secondary: { r: 220, g: 150, b: 50 },
      lightGray: { r: 245, g: 245, b: 245 }
    };

    // Header with logo and title
    doc.setFillColor(colors.lightGray.r, colors.lightGray.g, colors.lightGray.b);
    doc.rect(0, 0, pageWidth, 90, 'F');

    doc.addImage('assets/images/logo-dark.png', 'PNG', pageWidth - 180, 20, 150, 50);

    doc.setFontSize(7);
// Set font and color
doc.setFont('helvetica', 'bold');
doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);

// Define margin and starting y-position
const margins = 150;
let yPosition = 25; // Start slightly lower for better alignment

// Add text lines with improved spacing
doc.text('Société de fabrication des produits cosmétiques - Extraction des huiles végétales', margins, yPosition, { align: 'center' });
yPosition += 10; // More spacing
doc.text('Emballage, étiquetage, packaging, vente', margins, yPosition, { align: 'center' });
yPosition += 10; // More spacing
doc.text('Attestation de déclaration ministre de la santé DMP', margins, yPosition, { align: 'center' });
yPosition += 10; // More spacing
doc.text('Attestation de ONSSA / ISO 22716', margins, yPosition, { align: 'center' });
yPosition += 10; // More spacing
doc.text('Zone industrielle Almajed Tanger / 212 539351084 / 212 666954809', margins, yPosition, { align: 'center' });
yPosition += 10; // More spacing
doc.text('WWW.ADAGUEN.COM Import/Export', margins, yPosition, { align: 'center' });

// Invoice details
doc.setFontSize(12);
doc.setFont('helvetica', 'normal');
doc.setTextColor(0, 0, 0);

// Determine the type of document
const documentType = this.orderDetail?.documentType === 'FACTURE' ? 'Facture' : 'Bon de livraison';
const invoiceNumberText = `${documentType} N°: ${this.orderDetail?.invoiceNumber || 'N/A'}`;
const dueDateText = `Tanger le : ${this.orderDetail?.dueDate || 'N/A'}`;

doc.text(invoiceNumberText, margin, 120);
doc.text(dueDateText, margin, 140);

  // Client section
let currentY = 160;
const clientBoxWidth = 300; // Width for the client information box
const clientStartX = pageWidth - margin - clientBoxWidth;

doc.setFillColor(colors.lightGray.r, colors.lightGray.g, colors.lightGray.b);
doc.roundedRect(clientStartX, currentY, clientBoxWidth, 90, 5, 5, 'F');

doc.setFontSize(16);
doc.setFont('helvetica', 'bold');
doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
doc.text('Client', clientStartX + 10, currentY + 30);

doc.setFontSize(12);
doc.setFont('helvetica', 'normal');
doc.setTextColor(0, 0, 0);
doc.text(`Nom: ${this.orderDetail?.customer?.name || 'N/A'}`, clientStartX + 10, currentY + 50);
doc.text(`ICE: ${this.orderDetail?.customer?.ice }`, clientStartX + 10, currentY + 65);
doc.text(`Téléphone: ${this.orderDetail?.customer?.tele || 'N/A'}`, clientStartX + 10, currentY + 80);


    // Order summary
    currentY += 120;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);

  // Updated table for PDF
let grandTotal = 0;  // Initialize a variable to accumulate the grand total

autoTable(doc, {
  startY: currentY + 20,
  head: [['Article', 'Prix', 'Quantité', 'Total']],
  body: this.orderDetail?.orderProducts?.map(product => {
    const price = product.product.price;
    const quantity = product.quantity;
    const reduct = this.orderDetail?.reductionPercentage;
    const total = price * quantity;

    grandTotal += total;  // Accumulate the total for each product

    return [
      `${product.product.nom} - ${product.product.description}`,
      `${price} MAD`,
      quantity,
      `${total} MAD`
    ];
  }) || [],


      styles: {
        fontSize: 10,
        cellPadding: 8,
      },
      headStyles: {
        fillColor: [colors.primary.r, colors.primary.g, colors.primary.b],
        textColor: [255, 255, 255],
        fontSize: 11
      },
      columnStyles: {
        0: { cellWidth: 300 },
        1: { cellWidth: 80, halign: 'left' },
        2: { cellWidth: 80, halign: 'center' },
        3: { cellWidth: 80, halign: 'center' },
        4: { cellWidth: 80, halign: 'center' }
      },
      margin: { left: margin, right: margin },
    });

    // After the table, update the totals section
let finalY = (doc as any).lastAutoTable.finalY + 30;

// Set up styling for totals section
const totalsStartX = pageWidth - 250; // Starting X position for totals section
const labelWidth = 100;  // Width for labels
const valueWidth = 130;  // Width for values
const totalsStyle = {
    fontSize: 11,
    normalColor: [60, 60, 60] as [number, number, number],
    primaryColor: { r: 34, g: 45, b: 85 },
    secondaryColor: { r: 220, g: 150, b: 50 }
};

// Function to add total line with consistent styling
function addTotalLine(label: string, value: string, y: number, isHighlighted: boolean = false) {
    // Background for the entire line if highlighted
    if (isHighlighted) {
        doc.setFillColor(totalsStyle.primaryColor.r, totalsStyle.primaryColor.g, totalsStyle.primaryColor.b);
        doc.roundedRect(totalsStartX, y - 15, labelWidth + valueWidth, 25, 3, 3, 'F');
    }

    // Label
    doc.setFontSize(totalsStyle.fontSize);
    doc.setFont('helvetica', isHighlighted ? 'bold' : 'normal');
    doc.setTextColor(
        isHighlighted ? 255 : totalsStyle.normalColor[0],
        isHighlighted ? 255 : totalsStyle.normalColor[1],
        isHighlighted ? 255 : totalsStyle.normalColor[2]
    );
    doc.text(label, totalsStartX, y);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(
        isHighlighted ? 255 : totalsStyle.normalColor[0],
        isHighlighted ? 255 : totalsStyle.normalColor[1],
        isHighlighted ? 255 : totalsStyle.normalColor[2]
    );
    doc.text(value, totalsStartX + labelWidth + valueWidth, y, { align: 'right' });
}
 const remise=grandTotal-this.orderDetail?.totalAmount;
if (this.orderDetail?.documentType === 'FACTURE') {
    // Calculate values
    const totalAmount = this.orderDetail?.totalAmount ?? 0;
    const subtotalHT = totalAmount / 1.2;
    const tvaAmount = subtotalHT * 0.2;

    // Add separator line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(totalsStartX, finalY - 10, totalsStartX + labelWidth + valueWidth, finalY - 10);

    // Add totals
    if (this.orderDetail?.reductionPercentage !== 0.0) {
      addTotalLine('Total sans remise  :', `${grandTotal.toFixed(2)} MAD`, finalY + 5);
  }
    addTotalLine('Total HT:', `${subtotalHT.toFixed(2)} MAD`, finalY + 30);
    addTotalLine('TVA (20%):', `${tvaAmount.toFixed(2)} MAD`, finalY + 50);

    // Add final total with highlight
    addTotalLine('TOTAL TTC:', `${totalAmount.toFixed(2)} MAD`, finalY + 80, true);
} else {
    // For non-invoice documents, just show the total
    if (this.orderDetail?.reductionPercentage !== 0.0) {

      addTotalLine('Total sans remise  :', `${grandTotal.toFixed(2)} MAD`, finalY + 5);
      addTotalLine('Remise   :', `${remise.toFixed(2)} MAD`, finalY + 20);
  }
    addTotalLine(' TOTAL:', `${this.orderDetail?.totalAmount.toFixed(2)} MAD`, finalY + 50, true);
}

// Update finalY for footer positioning
finalY += 90;
    // Footer
    const footerY = doc.internal.pageSize.height - 70;
    doc.setDrawColor(colors.secondary.r, colors.secondary.g, colors.secondary.b);
    doc.setLineWidth(1);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);

    const footerText = [
      'LOT EL MAJD N°647-TANGER- MAROC TEL/FAX : +212 (05) 39351084 E-MAIL: ADAGUEN@GMAIL.COM',
      'Web : www.adaguen.com IF : 04935841 – PAT: 57198778- RC: 24833 – CNSS: 6942743',
      'ICE : 000067422000005'
    ];

    footerText.forEach((text, index) => {
      doc.text(text, pageWidth / 2, footerY + 15 + (index * 12), { align: 'center' });
    });

    doc.save(`Facture_${this.orderDetail?.invoiceNumber || 'N/A'}.pdf`);
}
}
