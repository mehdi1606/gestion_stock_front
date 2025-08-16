import { Component, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
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
  pageSize: number = 8;
  totalItems: number = 0;
  pageSizeOptions = [8, 25, 50, 100];

  @ViewChild('showModal', { static: false }) showModal?: ModalDirective;
  @ViewChild('removeItemModal', { static: false }) removeItemModal?: ModalDirective;

  constructor(
    private modalService: BsModalService,
    private formBuilder: UntypedFormBuilder,
    private datePipe: DatePipe,
    private router: Router,
    private route: ActivatedRoute,
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

    // NEW: Listen for query parameters to refresh when returning from edit
    this.route.queryParams.subscribe(params => {
      if (params['refresh'] === 'true') {
        this.autoRefreshOrders();
        // Clean up the URL
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {}
        });
      }
    });
  }

  fetchOrders() {
    axios.get('http://localhost:8044/api/orders')
      .then(response => {
        const data = response.data;
        console.log('Fetched orders:', data);
        this.orderlist = data.map(order => ({
          id: order.id,
          invoiceNumber: order.invoiceNumber,
          name: order.customer.name,
          date: order.dueDate,
          total: order.totalAmount,
          amountPaid: order.amountPaid,
          remainingAmount: order.remainingAmount,
          status: order.invoiceStatus,
        }));
        this.Allorderlist = [...this.orderlist];
        this.sortOrderListDescending();
      })
      .catch(error => {
        console.error('Error fetching orders:', error);
      });
  }

  // NEW: Manual refresh method
  refreshOrders() {
    Swal.fire({
      title: 'Refreshing...',
      text: 'Loading latest order data',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.fetchOrders();

    setTimeout(() => {
      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Refreshed!',
        text: 'Orders list has been updated',
        timer: 1500,
        showConfirmButton: false
      });
    }, 1000);
  }

  // NEW: Auto refresh method (silent)
  autoRefreshOrders() {
    this.fetchOrders();
  }

  sortOrderListDescending() {
    this.orderlist.sort((a, b) => Number(b.id) - Number(a.id));
    this.Allorderlist.sort((a, b) => Number(b.id) - Number(a.id));
    this.totalItems = this.orderlist.length;
  }

  // searchOrder() {
  //   if (this.term) {
  //     this.orderlist = this.Allorderlist.filter((data: any) => {
  //       return data.name.toLowerCase().includes(this.term.toLowerCase());
  //     });
  //   } else {
  //     this.orderlist = [...this.Allorderlist];
  //   }
  //   this.sortOrderListDescending();
  // }
searchOrder() {
  if (this.term && this.term.trim() !== '') {
    this.orderlist = this.Allorderlist.filter(order =>
      order.id.toString().toLowerCase().includes(this.term.toLowerCase()) ||
      order.invoiceNumber.toString().toLowerCase().includes(this.term.toLowerCase()) ||
      order.name.toLowerCase().includes(this.term.toLowerCase()) || // This line handles Billing Name search
      order.date.toLowerCase().includes(this.term.toLowerCase()) ||
      order.status.toLowerCase().includes(this.term.toLowerCase())
    );
  } else {
    this.orderlist = [...this.Allorderlist];
  }
}
  pageChanged(event: any): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.sortOrderListDescending();
  }

  onPageSizeChange(event: any): void {
    this.pageSize = event.target.value;
    this.pageIndex = 1;
    this.sortOrderListDescending();
  }

  getPaginatedOrders(): any[] {
    const startIndex = (this.pageIndex - 1) * this.pageSize;
    return this.orderlist.slice(startIndex, startIndex + this.pageSize);
  }

  navigateToCart() {
    this.router.navigate(['/ecommerce/cart']);
  } 

  // NEW: Navigate to cart with order data for editing
  editOrder(orderId: number) {
    // Navigate to cart component with order ID for editing
    this.router.navigate(['/ecommerce/cart'], {
      queryParams: { editOrderId: orderId }
    });
  }

  // NEW: Quick edit modal for basic order information
  editOrderBasicInfo(sale: any) {
    Swal.fire({
      title: 'Edit Order Information',
      html: this.getEditOrderHtml(sale),
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Update Order',
      cancelButtonText: 'Cancel',
      width: '600px',
      preConfirm: () => {
        const form = document.getElementById('editOrderForm') as HTMLFormElement;
        const formData = new FormData(form);

        return {
          customerId: formData.get('customerId'),
          documentType: formData.get('documentType'),
          dueDate: formData.get('dueDate'),
          reductionPercentage: formData.get('reductionPercentage'),
          amountPaid: formData.get('amountPaid')
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.updateOrderBasicInfo(sale.id, result.value);
      }
    });
  }

  getEditOrderHtml(sale: any): string {
    // First fetch customers and order details
    return `
      <form id="editOrderForm" style="text-align: left;">
        <div class="form-group" style="margin-bottom: 15px;">
          <label for="customerId" style="display: block; margin-bottom: 5px; font-weight: bold;">Customer:</label>
          <input type="text" id="customerId" name="customerId" class="swal2-input" value="${sale.name}" readonly style="background-color: #f5f5f5;">
        </div>

        <div class="form-group" style="margin-bottom: 15px;">
          <label for="documentType" style="display: block; margin-bottom: 5px; font-weight: bold;">Document Type:</label>
          <select id="documentType" name="documentType" class="swal2-input">
            <option value="FACTURE">Facture</option>
            <option value="BON_DE_LIVRAISON">Bon de Livraison</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom: 15px;">
          <label for="dueDate" style="display: block; margin-bottom: 5px; font-weight: bold;">Due Date:</label>
          <input type="date" id="dueDate" name="dueDate" class="swal2-input" value="${sale.date}">
        </div>

        <div class="form-group" style="margin-bottom: 15px;">
          <label for="reductionPercentage" style="display: block; margin-bottom: 5px; font-weight: bold;">Reduction Percentage:</label>
          <input type="number" id="reductionPercentage" name="reductionPercentage" class="swal2-input" min="0" max="100" step="0.01" placeholder="0">
        </div>

        <div class="form-group" style="margin-bottom: 15px;">
          <label for="amountPaid" style="display: block; margin-bottom: 5px; font-weight: bold;">Amount Paid:</label>
          <input type="number" id="amountPaid" name="amountPaid" class="swal2-input" min="0" step="0.01" value="${sale.amountPaid}">
        </div>
      </form>
    `;
  }

  updateOrderBasicInfo(orderId: number, updateData: any) {
    const payload = {
      documentType: updateData.documentType,
      dueDate: updateData.dueDate,
      reductionPercentage: parseFloat(updateData.reductionPercentage) || 0,
      amountPaid: parseFloat(updateData.amountPaid) || 0
    };

    axios.put(`http://localhost:8044/api/orders/${orderId}`, payload)
      .then(response => {
        Swal.fire('Success', 'Order updated successfully!', 'success');
        this.autoRefreshOrders(); // NEW: Auto refresh after update
      })
      .catch(error => {
        console.error('Error updating order:', error);
        Swal.fire('Error', 'Failed to update order.', 'error');
      });
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
            Swal.fire('Deleted!', 'Order has been deleted.', 'success');
            this.autoRefreshOrders(); // NEW: Auto refresh after deletion
          })
          .catch(error => {
            Swal.fire('Error!', 'Failed to delete order.', 'error');
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
    return product.product.category === 'Alimentaire' || product.product.category === 'Cosmetique';
  }

  calculateDiscount(product: any): number {
    if (this.isDiscountable(product)) {
        return product.product.price * 0.3;
    }
    return 0;
  }

  calculateTotal(product: any): number {
    const basePrice = product.product.price;
    const quantity = product.quantity;
    const discount = this.calculateDiscount(product);
    const total = (basePrice - discount) * quantity;
    return total;
  }

  downloadPdf(sale: any) {
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

    doc.addImage('assets/images/logo-dark.png', 'PNG', pageWidth - 180, 20, 150, 50);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);

    const margins = 150;
    let yPosition = 25;

    doc.text('Société de fabrication des produits cosmétiques - Extraction des huiles végétales', margins, yPosition, { align: 'center' });
    yPosition += 10;
    doc.text('Emballage, étiquetage, packaging, vente', margins, yPosition, { align: 'center' });
    yPosition += 10;
    doc.text('Attestation de déclaration ministre de la santé DMP', margins, yPosition, { align: 'center' });
    yPosition += 10;
    doc.text('Attestation de ONSSA / ISO 22716', margins, yPosition, { align: 'center' });
    yPosition += 10;
    doc.text('Zone industrielle Almajed Tanger / 212 539351084 / 212 666954809', margins, yPosition, { align: 'center' });
    yPosition += 10;
    doc.text('WWW.ADAGUEN.COM Import/Export', margins, yPosition, { align: 'center' });

    // Invoice details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const documentType = this.orderDetail?.documentType === 'FACTURE' ? 'Facture' : 'Bon de livraison';
    const invoiceNumberText = `${documentType} N°: ${this.orderDetail?.invoiceNumber || 'N/A'}`;
    const dueDateText = `Tanger le : ${this.orderDetail?.dueDate || 'N/A'}`;

    doc.text(invoiceNumberText, margin, 120);
    doc.text(dueDateText, margin, 140);

    // Client section
    let currentY = 160;
    const clientBoxWidth = 300;
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

    let grandTotal = 0;

    autoTable(doc, {
      startY: currentY + 20,
      head: [['Article', 'Prix', 'Quantité', 'Total']],
      body: this.orderDetail?.orderProducts?.map(product => {
        const price = product.product.price;
        const quantity = product.quantity;
        const total = price * quantity;
        grandTotal += total;

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

    const totalsStartX = pageWidth - 250;
    const labelWidth = 100;
    const valueWidth = 130;
    const totalsStyle = {
      fontSize: 11,
      normalColor: [60, 60, 60] as [number, number, number],
      primaryColor: { r: 34, g: 45, b: 85 },
      secondaryColor: { r: 220, g: 150, b: 50 }
    };

    function addTotalLine(label: string, value: string, y: number, isHighlighted: boolean = false) {
      if (isHighlighted) {
          doc.setFillColor(totalsStyle.primaryColor.r, totalsStyle.primaryColor.g, totalsStyle.primaryColor.b);
          doc.roundedRect(totalsStartX, y - 15, labelWidth + valueWidth, 25, 3, 3, 'F');
      }

      doc.setFontSize(totalsStyle.fontSize);
      doc.setFont('helvetica', isHighlighted ? 'bold' : 'normal');
      doc.setTextColor(
          isHighlighted ? 255 : totalsStyle.normalColor[0],
          isHighlighted ? 255 : totalsStyle.normalColor[1],
          isHighlighted ? 255 : totalsStyle.normalColor[2]
      );
      doc.text(label, totalsStartX, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(
          isHighlighted ? 255 : totalsStyle.normalColor[0],
          isHighlighted ? 255 : totalsStyle.normalColor[1],
          isHighlighted ? 255 : totalsStyle.normalColor[2]
      );
      doc.text(value, totalsStartX + labelWidth + valueWidth, y, { align: 'right' });
    }

    const remise = grandTotal - this.orderDetail?.totalAmount;

    if (this.orderDetail?.documentType === 'FACTURE') {
      const totalAmount = this.orderDetail?.totalAmount ?? 0;
      const subtotalHT = totalAmount / 1.2;
      const tvaAmount = subtotalHT * 0.2;

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(totalsStartX, finalY - 10, totalsStartX + labelWidth + valueWidth, finalY - 10);

      if (this.orderDetail?.reductionPercentage !== 0.0) {
        addTotalLine('Total sans remise  :', `${grandTotal.toFixed(2)} MAD`, finalY + 5);
      }
      addTotalLine('Total HT:', `${subtotalHT.toFixed(2)} MAD`, finalY + 30);
      addTotalLine('TVA (20%):', `${tvaAmount.toFixed(2)} MAD`, finalY + 50);
      addTotalLine('TOTAL TTC:', `${totalAmount.toFixed(2)} MAD`, finalY + 80, true);
    } else {
      if (this.orderDetail?.reductionPercentage !== 0.0) {
        addTotalLine('Total sans remise  :', `${grandTotal.toFixed(2)} MAD`, finalY + 5);
        addTotalLine('Remise   :', `${remise.toFixed(2)} MAD`, finalY + 20);
      }
      addTotalLine(' TOTAL:', `${this.orderDetail?.totalAmount.toFixed(2)} MAD`, finalY + 50, true);
    }

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