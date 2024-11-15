import { Component, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import axios from 'axios';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
})
export class OrdersComponent {
  enditem: any;
  modalRef?: BsModalRef;
  masterSelected!: boolean;
  breadCrumbItems: Array<{}>;
  term: any;
  orderlist: any;
  ordersForm!: UntypedFormGroup;
  submitted = false;
  currentSortField: string = 'id';
  isAscending: boolean = true;
  total: Observable<number>;
  page: any = 1;
  orderDetail: any;
  deletId: any;
  Allorderlist: any;
  pageIndex: number = 1;
  pageSize: number = 8;   // Number of items per page
  totalItems: number = 0; // Total number of items for pagination
  pageSizeOptions = [8, 25, 50, 100];  // Available options for items per page

  @ViewChild('showModal', { static: false }) showModal?: ModalDirective;
  @ViewChild('removeItemModal', { static: false }) removeItemModal?: ModalDirective;

  constructor(
    private modalService: BsModalService,
    private formBuilder: UntypedFormBuilder,
    private datePipe: DatePipe,
    private router: Router,
    private store: Store
  ) {}

  ngOnInit() {
    this.breadCrumbItems = [{ label: 'Ecommerce' }, { label: 'Orders', active: true }];

    // Form Validation
    this.ordersForm = this.formBuilder.group({
      id: [''],
      name: ['', [Validators.required]],
      date: ['', [Validators.required]],
      total: ['', [Validators.required]],
      amountPaid: ['', [Validators.required]],
      remainingAmount: ['', [Validators.required]],
      status: ['', [Validators.required]],
    });

    // Fetch data from backend
    this.fetchOrders();
  }

  fetchOrders() {
    axios.get('http://localhost:8044/api/orders')
      .then(response => {
        const data = response.data;
        this.orderlist = data.map(order => ({
          id: order.id,
          name: order.customer.name,
          date: order.dueDate,
          total: order.totalAmount,
          amountPaid: order.amountPaid,
          remainingAmount: order.remainingAmount,
          status: order.invoiceStatus,
        }));
        this.Allorderlist = [...this.orderlist];
        // Tri automatique après chargement des données
        this.sortOrderListDescending();
      })
      .catch(error => {
        console.error('Error fetching orders:', error);
      });
  }

  sortOrderListDescending() {
    this.orderlist.sort((a, b) => Number(b.id) - Number(a.id));
    this.Allorderlist.sort((a, b) => Number(b.id) - Number(a.id));
    this.totalItems = this.orderlist.length;
  }

  // Important : Ajouter aussi le tri après la recherche
  searchOrder() {
    if (this.term) {
      this.orderlist = this.Allorderlist.filter((data: any) => {
        return data.name.toLowerCase().includes(this.term.toLowerCase());
      });
    } else {
      this.orderlist = [...this.Allorderlist];
    }
    // Maintenir le tri après la recherche
    this.sortOrderListDescending();
  }

  // Maintenir le tri après le changement de page

  pageChanged(event: any): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.sortOrderListDescending();
  }
  onPageSizeChange(event: any): void {
    this.pageSize = event.target.value;
    this.pageIndex = 1; // Reset to the first page when page size changes
    this.sortOrderListDescending();
  }

  getPaginatedOrders(): any[] {
    const startIndex = (this.pageIndex - 1) * this.pageSize;
    return this.orderlist.slice(startIndex, startIndex + this.pageSize);
  }


  // Function to handle the pagination logic for fetching the correct page
  // getPaginatedOrders(): any[] {
  //   // You can slice your orderlist based on the pageIndex and pageSize
  //   const startIndex = (this.pageIndex - 1) * this.pageSize;
  //   return this.orderlist.slice(startIndex, startIndex + this.pageSize);
  // }
  navigateToCart() {
    this.router.navigate(['/ecommerce/cart']);
  }

  checkUncheckAll(ev: any) {
    this.orderlist.forEach((x: { state: any }) => (x.state = ev.target.checked));
  }

  deleteData(id: any) {
    if (id) {
      document.getElementById('lj_' + id)?.remove();
    } else {
      this.orderlist.filter((x: { state: boolean }) => x.state).forEach((item: any) => {
        document.getElementById('lj_' + item.id)?.remove();
      });
    }
  }


  deleteSale(sale: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`http://localhost:8044/api/orders/${sale.id}`)
          .then(() => {
            Swal.fire(
              'Deleted!',
              'Order has been deleted.',
              'success'
            );
            this.fetchOrders(); // Refresh the list
          })
          .catch(error => {
            Swal.fire(
              'Error!',
              'Failed to delete order.',
              'error'
            );
            console.error('Error deleting order:', error);
          });
      }
    });
  }

  editSale(sale: any) {
    this.ordersForm.patchValue({
      id: sale.id,
      name: sale.name,
      date: sale.date,
      total: sale.total,
      amountPaid: sale.amountPaid,
      remainingAmount: sale.remainingAmount,
      status: sale.status
    });

    this.showModal?.show();
  }




  navigateToInvoiceDetail(orderId: number) {
    // Navigate to the invoice detail page with the order ID
    this.router.navigate([`/invoices/detail`, orderId]);
  }



  sortBy(field: string) {
    if (this.currentSortField === field) {
      this.isAscending = !this.isAscending;
    } else {
      this.currentSortField = field;
      this.isAscending = true;
    }
    this.orderlist.sort((a: any, b: any) => {
      if (a[field] < b[field]) {
        return this.isAscending ? -1 : 1;
      } else if (a[field] > b[field]) {
        return this.isAscending ? 1 : -1;
      } else {
        return 0;
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


downloadPdf(sale: any) {
  // First fetch the order details
  axios.get(`http://localhost:8044/api/orders/${sale.id}`)
    .then(response => {
      this.orderDetail = response.data;
      this.generatePDF();
    })
    .catch(error => {
      Swal.fire({
        title: 'Error!',
        text: 'Failed to fetch order details for PDF generation.',
        icon: 'error'
      });
      console.error('Error fetching order details:', error);
    });
}

generatePDF() {
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

  // Note: Make sure the logo path is correct
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

  // Table
  autoTable(doc, {
    startY: currentY + 20,
    head: [['Article', 'Prix', 'Quantité', 'Total']],
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
      3: { cellWidth: 80, halign: 'center' }
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
