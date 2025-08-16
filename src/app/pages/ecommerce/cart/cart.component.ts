import Swal from 'sweetalert2';
import axios from 'axios';
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {
  paymentAmount: number | null = null;

  breadCrumbItems: Array<{}>;
  cartData: any[] = [];
  availableProducts: any[] = [];
  filteredProducts: any[] = [];
  selectedProductsForCart: any[] = [];
  customers: any[] = [];
  selectedCustomerId: number;
  readonly REDUCTION_RATE = 0.30;
  reductionPercentage: number = 0;
  documentType: any;
  orderDate: any;
  readonly TVA_RATE: number = 0.20;

  // NEW: Edit mode properties
  isEditMode: boolean = false;
  editOrderId: number | null = null;
  originalOrderData: any = null;

  constructor(private router: Router, private route: ActivatedRoute) { }

  ngOnInit() {
    this.breadCrumbItems = [{ label: 'Ecommerce' }, { label: 'Cart', active: true }];

    // NEW: Check if we're in edit mode
    this.route.queryParams.subscribe(params => {
      if (params['editOrderId']) {
        this.isEditMode = true;
        this.editOrderId = parseInt(params['editOrderId']);
        this.loadOrderForEdit(this.editOrderId);
      }
    });

    this.fetchCustomers();
  }

  // NEW: Load existing order data for editing
  loadOrderForEdit(orderId: number) {
    axios.get(`http://localhost:8044/api/orders/${orderId}`)
      .then(response => {
        this.originalOrderData = response.data;
        this.populateFormWithOrderData(this.originalOrderData);

        // Update breadcrumb to show edit mode
        this.breadCrumbItems = [
          { label: 'Ecommerce' },
          { label: 'Cart' },
          { label: `Edit Order #${orderId}`, active: true }
        ];
      })
      .catch(error => {
        console.error('Error loading order for edit:', error);
        Swal.fire('Error', 'Could not load order data for editing.', 'error');
        this.router.navigate(['/ecommerce/orders']);
      });
  }

  // NEW: Populate form fields with existing order data
  populateFormWithOrderData(orderData: any) {
    // Set basic order info
    this.selectedCustomerId = orderData.customer.id;
    this.documentType = orderData.documentType;
    this.orderDate = orderData.dueDate;
    this.reductionPercentage = orderData.reductionPercentage || 0;
    this.paymentAmount = orderData.amountPaid || 0;

    // Clear existing cart data
    this.cartData = [];

    // Populate cart with order products
    if (orderData.orderProducts && orderData.orderProducts.length > 0) {
      orderData.orderProducts.forEach(orderProduct => {
        this.cartData.push({
          productId: orderProduct.product.id,
          name: orderProduct.product.nom || orderProduct.product.name,
          price: orderProduct.product.price,
          description: orderProduct.product.description,
          qty: orderProduct.quantity,
          total: orderProduct.product.price * orderProduct.quantity,
          category: orderProduct.product.category
        });
      });
    }

    // Apply reductions if any
    if (this.reductionPercentage > 0) {
      this.applyReductionToProducts();
    }
  }

  fetchCustomers() {
    return axios.get('http://localhost:8044/api/customers/all')
      .then(response => {
        this.customers = response.data;
      })
      .catch(error => {
        console.error('Error fetching customers:', error);
        Swal.fire('Error', 'Could not fetch customers.', 'error');
      });
  }

  openProductModal() {
    this.fetchProducts().then(() => {
      this.filteredProducts = [...this.availableProducts];
      this.selectedProductsForCart = [];
      this.showProductSelectionPopup();
    });
  }

  fetchProducts() {
    return axios.get('http://localhost:8044/api/products')
      .then(response => {
        this.availableProducts = response.data.map(product => {
          const mimeType = 'image/jpeg';
          const imageData = `data:${mimeType};base64,${product.imageProduct}`;
          return {
            id: product.id,
            name: product.name || product.nom,
            price: product.price,
            description: product.description,
            image: imageData,
            qty: 0,
            category: product.category,
            selectedOrder: -1
          };
        });
      })
      .catch(error => {
        console.error('Error fetching products:', error);
        Swal.fire('Error', 'Could not fetch products.', 'error');
      });
  }

  addSelectedProducts(selectedProducts: any[]) {
    selectedProducts.sort((a, b) => a.selectedOrder - b.selectedOrder);

    selectedProducts.forEach(product => {
      this.cartData.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        description: product.description,
        qty: product.qty,
        total: product.price * product.qty,
        category: product.category
      });
    });
  }

  removeProduct(index: number) {
    this.cartData.splice(index, 1);
  }

  showProductSelectionPopup() {
    this.renderSwal();
  }

  renderSwal() {
    Swal.fire({
      title: 'Select Products',
      html: this.getProductSelectionHtml(),
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Add to Cart',
      cancelButtonText: 'Close',
      preConfirm: () => {
        const selectedProducts = this.availableProducts.filter(product => product.selectedOrder >= 0);
        this.addSelectedProducts(selectedProducts);
      },
      didOpen: () => {
        this.bindQuantityButtons();
        this.bindSearchFunctionality();
      }
    }).then(() => {
      this.availableProducts.forEach(product => {
        product.qty = 0;
        product.selectedOrder = -1;
      });
    });
  }

  getProductSelectionHtml() {
    return `
      <style>
        .swal2-popup {
          font-family: 'Roboto', sans-serif;
          width: 900px !important;
          padding: 20px;
          border-radius: 10px;
          background: #ffffff;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .swal2-title {
          font-size: 28px;
          font-weight: bold;
          color: #444;
          margin-bottom: 15px;
        }

        .product-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin: 10px 0;
          background: #f9f9f9;
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }

        .product-container:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .product-details {
          color: #333;
          font-size: 18px;
          font-weight: 600;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
        }

        .btn-increase, .btn-decrease {
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          padding: 8px 10px;
          cursor: pointer;
          margin: 0 5px;
          transition: background-color 0.3s;
          font-size: 16px;
        }

        .btn-increase:hover, .btn-decrease:hover {
          background-color: #0056b3;
        }

        .btn-decrease {
          background-color: #dc3545;
        }

        .btn-decrease:hover {
          background-color: #c82333;
        }

        .product-quantity {
          font-size: 20px;
          color: #333;
          font-weight: 500;
          margin: 0 10px;
        }

        #search {
          padding: 12px;
          border: 1px solid #ccc;
          border-radius: 25px;
          width: calc(100% - 24px);
          margin-bottom: 20px;
          font-size: 16px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }

        #search:focus {
          border-color: #007bff;
          outline: none;
        }

        .product-list-container {
          max-height: 400px;
          overflow-y: auto;
          width: 100%;
        }

        .swal2-cancel {
          background-color: #f0f0f0;
          border-color: #ccc;
        }

        .swal2-confirm {
          background-color: #28a745;
          color: white;
          border-radius: 5px;
        }

        .swal2-confirm:hover {
          background-color: #218838;
        }

        .product-selected {
          background-color: #e8f5e9;
          border-left: 5px solid #28a745;
        }

        .selection-order {
          display: inline-block;
          width: 24px;
          height: 24px;
          line-height: 24px;
          text-align: center;
          border-radius: 50%;
          background-color: #28a745;
          color: white;
          font-weight: bold;
          margin-right: 10px;
        }
      </style>
      <div style="width: 100%;">
        <input type="text" id="search" class="swal2-input" placeholder="Search products..." />
        <div class="product-list-container" id="product-list">
          ${this.filteredProducts.map(product => `
            <div class="product-container" data-name="${product.name}" data-id="${product.id}">
              <div class="product-details">
                ${product.selectedOrder >= 0 ? `<span class="selection-order">${product.selectedOrder + 1}</span>` : ''}
                ${product.name} - ${product.description} (${product.price}MAD)
              </div>
              <div class="quantity-controls">
                <button class="btn-increase" data-id="${product.id}">+</button>
                <span class="product-quantity" id="qty-${product.id}">${product.qty}</span>
                <button class="btn-decrease" data-id="${product.id}" ${product.qty === 0 ? 'disabled' : ''}>-</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindSearchFunctionality() {
    const searchInput = document.getElementById('search') as HTMLInputElement;
    const productList = document.getElementById('product-list') as HTMLElement;
    searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.toLowerCase();
      const products = productList.querySelectorAll('.product-container');

      products.forEach((product) => {
        const productElement = product as HTMLElement;
        const productName = productElement.getAttribute('data-name')?.toLowerCase() || '';
        if (productName.includes(searchTerm)) {
          productElement.style.display = '';
        } else {
          productElement.style.display = 'none';
        }
      });
    });
  }

  bindQuantityButtons() {
    const increaseButtons = document.querySelectorAll('.btn-increase');
    const decreaseButtons = document.querySelectorAll('.btn-decrease');

    let selectedCount = this.availableProducts.filter(p => p.selectedOrder >= 0).length;

    increaseButtons.forEach(button => {
      button.addEventListener('click', (event: any) => {
        const productId = event.target.getAttribute('data-id');
        const product = this.availableProducts.find(p => p.id == productId);
        if (product) {
          if (product.qty === 0) {
            product.selectedOrder = selectedCount++;
            const productContainer = document.querySelector(`.product-container[data-id="${productId}"]`);
            if (productContainer) {
              productContainer.classList.add('product-selected');
            }
          }
          product.qty++;
          this.updateSwalQtyDisplay(product);
        }
      });
    });

    decreaseButtons.forEach(button => {
      button.addEventListener('click', (event: any) => {
        const productId = event.target.getAttribute('data-id');
        const product = this.availableProducts.find(p => p.id == productId);
        if (product && product.qty > 0) {
          product.qty--;
          this.updateSwalQtyDisplay(product);

          if (product.qty === 0) {
            const oldOrder = product.selectedOrder;
            product.selectedOrder = -1;

            const productContainer = document.querySelector(`.product-container[data-id="${productId}"]`);
            if (productContainer) {
              productContainer.classList.remove('product-selected');
            }

            this.availableProducts.forEach(p => {
              if (p.selectedOrder > oldOrder) {
                p.selectedOrder--;

                const container = document.querySelector(`.product-container[data-id="${p.id}"]`);
                if (container) {
                  const orderIndicator = container.querySelector('.selection-order');
                  if (orderIndicator) {
                    orderIndicator.textContent = (p.selectedOrder + 1).toString();
                  }
                }
              }
            });

            selectedCount--;
          }
        }
      });
    });
  }

  updateSwalQtyDisplay(product) {
    const qtyDisplay = document.getElementById(`qty-${product.id}`);
    const decreaseButton = document.querySelector(`.btn-decrease[data-id="${product.id}"]`);
    if (qtyDisplay) {
      qtyDisplay.textContent = product.qty.toString();
    }
    if (decreaseButton) {
      (decreaseButton as HTMLButtonElement).disabled = product.qty === 0;
    }

    if (product.selectedOrder >= 0) {
      const productContainer = document.querySelector(`.product-container[data-id="${product.id}"]`);
      if (productContainer) {
        let orderIndicator = productContainer.querySelector('.selection-order');
        if (!orderIndicator && product.qty > 0) {
          const detailsElement = productContainer.querySelector('.product-details');
          if (detailsElement) {
            orderIndicator = document.createElement('span');
            orderIndicator.className = 'selection-order';
            orderIndicator.textContent = (product.selectedOrder + 1).toString();
            detailsElement.prepend(orderIndicator);
          }
        } else if (orderIndicator && product.qty === 0) {
          orderIndicator.remove();
        }
      }
    }
  }

  getReduction(product): number {
    if (product.category === 'Argan') {
      return 0;
    }
    if (!this.reductionPercentage) {
      return 0;
    }
    return (product.price * product.qty) * (this.reductionPercentage / 100);
  }

  calculateProductTotal(product: any): number {
    if (product.category === 'Argan') {
      return product.price * product.qty;
    }
    const discount = (this.reductionPercentage / 100) * product.price;
    return (product.price - discount) * product.qty;
  }

  calculateProductTVA(product: any): number {
    if (this.documentType !== 'FACTURE') {
      return 0;
    }
    const totalBeforeTVA = this.calculateProductTotal(product);
    return totalBeforeTVA * this.TVA_RATE;
  }

  calculateProductTotalWithTVA(product: any): number {
    const totalBeforeTVA = this.calculateProductTotal(product);
    if (this.documentType === 'FACTURE') {
      return totalBeforeTVA + this.calculateProductTVA(product);
    }
    return totalBeforeTVA;
  }

  calculateSubTotal(): number {
    return this.cartData.reduce((total, product) => {
      return total + this.calculateProductTotal(product);
    }, 0);
  }

  calculateTotalTVA(): number {
    if (this.documentType !== 'FACTURE') {
      return 0;
    }
    return this.cartData.reduce((total, product) => {
      return total + this.calculateProductTVA(product);
    }, 0);
  }

  calculateTotal(): number {
    const subtotal = this.calculateSubTotal();
    if (this.documentType === 'FACTURE') {
      return subtotal + this.calculateTotalTVA();
    }
    return subtotal;
  }

  applyReductionToProducts(): void {
    this.cartData.forEach(product => {
      if (product.category !== 'Argan') {
        product.reduction = (this.reductionPercentage / 100) * product.price;
      } else {
        product.reduction = 0;
      }
      product.total = this.calculateProductTotal(product);
    });
  }

  // NEW: Enhanced save method that handles both create and update
  saveOrder() {
    if (!this.selectedCustomerId) {
      Swal.fire('Error', 'Please select a customer before saving the order.', 'error');
      return;
    }

    if (this.cartData.length === 0) {
      Swal.fire('Error', 'Please add at least one product to the order.', 'error');
      return;
    }

    const order = {
      customerId: this.selectedCustomerId,
      documentType: this.documentType,
      dueDate: this.orderDate,
      reductionPercentage: this.reductionPercentage || 0,
      products: this.cartData.map(product => ({
        productId: product.productId,
        quantity: product.qty
      }))
    };

    // Choose API endpoint based on edit mode
    const apiCall = this.isEditMode
      ? axios.put(`http://localhost:8044/api/orders/${this.editOrderId}`, order)
      : axios.post('http://localhost:8044/api/orders', order);

    const successMessage = this.isEditMode ? 'Order updated successfully!' : 'Order saved successfully!';

    apiCall
      .then(response => {
        Swal.fire('Success', successMessage, 'success');

        if (!this.isEditMode) {
          this.cartData = []; // Clear cart only for new orders
        }

        // Handle payment if specified
        if (this.paymentAmount && this.paymentAmount > 0) {
          return axios.post(`http://localhost:8044/api/orders/makePaymentByCustomer/${this.selectedCustomerId}?paymentAmount=${this.paymentAmount}`)
            .then(paymentResponse => {
              Swal.fire('Success', 'Payment made successfully!', 'success');
              this.paymentAmount = null;
            })
            .catch(paymentError => {
              console.error('Error processing payment:', paymentError);
              Swal.fire('Error', 'There was an error processing the payment.', 'error');
            });
        }

        // Navigate to orders list after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/ecommerce/orders']);
        }, 2000);
      })
      .catch(error => {
        console.error('Error saving order:', error);
        const errorMessage = this.isEditMode ? 'There was an error updating the order.' : 'There was an error saving the order.';
        Swal.fire('Error', errorMessage, 'error');
      });
  }

  // NEW: Cancel edit and return to orders
  cancelEdit() {
    if (this.isEditMode) {
      Swal.fire({
        title: 'Cancel Edit?',
        text: 'Any unsaved changes will be lost.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, cancel editing'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/ecommerce/orders']);
        }
      });
    } else {
      this.router.navigate(['/ecommerce/orders']);
    }
  }
}      