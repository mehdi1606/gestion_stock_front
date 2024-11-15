import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.breadCrumbItems = [{ label: 'Factures' }, { label: 'Détails', active: true }];

    this.route.paramMap.subscribe(params => {
      const orderId = params.get('id');
      if (orderId) {
        this.fetchOrderDetails(orderId);
      }
    });
  }
  isDiscountable(product: any): boolean {
    // Check if the product is in the Alimentaire or Cosmétique categories
    return product.product.category === 'Alimentaire' || product.product.category === 'Cosmetique';
}

calculateDiscount(product: any): number {
    // Apply a 30% discount for eligible products
    if (this.isDiscountable(product)) {
        return product.product.price * 0.3; // 30% discount
    }
    return 0;
}

calculateTotal(product: any): number {
    const basePrice = product.product.price;
    const quantity = product.quantity;
    const discount = this.calculateDiscount(product);

    // Total after discount
    const total = (basePrice - discount) * quantity;
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

    doc.addImage('assets/images/logo-light.png', 'PNG', pageWidth - 120, 30, 100, 50);

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
    doc.text('Société de Fabrications', margin, 50);
    doc.setFontSize(18);
    doc.text('Produits Cosmétiques et Huiles', margin, 80);

    // Invoice details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Facture N°: ${this.orderDetail?.invoiceNumber || 'N/A'}`, margin, 120);
    doc.text(`Date de la facture: ${this.orderDetail?.dueDate || 'N/A'}`, margin, 140);

    // Client section
    let currentY = 160;
    doc.setFillColor(colors.lightGray.r, colors.lightGray.g, colors.lightGray.b);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 90, 5, 5, 'F');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
    doc.text('FACTURÉ À', margin + 10, currentY + 30);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Nom: ${this.orderDetail?.customer?.name || 'N/A'}`, margin + 10, currentY + 50);
    doc.text(`Adresse: ${this.orderDetail?.customer?.localisation || 'N/A'}`, margin + 10, currentY + 65);
    doc.text(`Téléphone: ${this.orderDetail?.customer?.tele || 'N/A'}`, margin + 10, currentY + 80);

    // Order summary
    currentY += 120;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
    doc.text('RÉSUMÉ DE LA COMMANDE', margin, currentY);

    // Updated table for PDF
    autoTable(doc, {
      startY: currentY + 20,
      head: [['Article', 'Prix', 'Quantité',  'Total']],
      body: this.orderDetail?.orderProducts?.map(product => {
        const price = product.product.price;
        const quantity = product.quantity;
        const total = this.calculateTotal(product);

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

    let finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
    doc.roundedRect(pageWidth - 200, finalY, 180, 40, 5, 5, 'F');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.secondary.r, colors.secondary.g, colors.secondary.b);
    const totalText = `TOTAL: ${this.orderDetail?.totalAmount || 'N/A'} MAD`;
    doc.text(totalText, pageWidth - margin, finalY + 25, { align: 'right' });

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
