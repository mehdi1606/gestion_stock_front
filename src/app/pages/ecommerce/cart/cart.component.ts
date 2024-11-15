import Swal from 'sweetalert2';
import axios from 'axios';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {
  paymentAmount: number | null = null; // To hold the payment amount

  breadCrumbItems: Array<{}>;
  cartData: any[] = [];
  availableProducts: any[] = [];
  filteredProducts: any[] = [];
  customers: any[] = [];
  selectedCustomerId: number ; // To hold the selected customer ID
  readonly REDUCTION_RATE = 0.30; // Static reduction rate

  constructor(private router: Router) { }

  ngOnInit() {
    this.breadCrumbItems = [{ label: 'Ecommerce' }, { label: 'Cart', active: true }];
    this.fetchCustomers(); // Fetch customers on component init
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

  // Calculate Total Cost of Cart
  calculateTotal(): number {
    return this.cartData.reduce((total, product) => {
      const reduction = this.getReduction(product);
      return total + (product.price * product.qty) - reduction;
    }, 0);
  }


  getReduction(product): number {
    const { category } = product; // Assuming category is part of the product
    if (category === 'Alimentaire' || category === 'Cosmetique') {
      return product.price * this.REDUCTION_RATE * product.qty;
    }
    return 0;
  }

  openProductModal() {
    this.fetchProducts().then(() => {
      this.filteredProducts = [...this.availableProducts];
      this.showProductSelectionPopup();
    });
  }

  fetchProducts() {
    return axios.get('http://localhost:8044/api/products')
      .then(response => {
        this.availableProducts = response.data.map(product => {
          const mimeType = 'image/jpeg'; // or 'image/png' depending on your image format
          const imageData = `data:${mimeType};base64,${product.imageProduct}`;
          return {
            id: product.id,
            name: product.nom,
            price: product.price,
            description: product.description,
            image: imageData,
            qty: 0, // Initialize quantity to 0
            category: product.category // Assuming this is available
          };
        });
      })
      .catch(error => {
        console.error('Error fetching products:', error);
        Swal.fire('Error', 'Could not fetch products.', 'error');
      });
  }

  addSelectedProducts(selectedProducts: any[]) {
    selectedProducts.forEach(product => {
      this.cartData.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        qty: product.qty,
        total: product.price * product.qty,
        category: product.category // Add category to cartData for reduction calculation
      });
    });
  }

  removeProduct(index: number) {
    this.cartData.splice(index, 1);
  }
  showProductSelectionPopup() {
    this.renderSwal();
  }

  // renderSwal() {
  //   Swal.fire({
  //     title: 'Select Products',
  //     html: this.getProductSelectionHtml(),
  //     focusConfirm: false,
  //     showCancelButton: true,
  //     confirmButtonText: 'Add to Cart',
  //     cancelButtonText: 'Close',
  //     preConfirm: () => {
  //       const selectedProducts = this.availableProducts.filter(product => product.qty > 0);
  //       this.addSelectedProducts(selectedProducts);
  //     },
  //     didOpen: () => {
  //       this.bindQuantityButtons();
  //     }
  //   }).then(() => {
  //     this.availableProducts.forEach(product => product.qty = 0);
  //   });
  // }

  // getProductSelectionHtml() {
  //   return `
  //     <style>
  //       .swal2-popup {
  //         font-family: 'Roboto', sans-serif;
  //         width: 500px !important;
  //         padding: 30px;
  //         border-radius: 15px;
  //         background: #f4f7fa;
  //       }

  //       .swal2-title {
  //         font-size: 24px;
  //         font-weight: 500;
  //         color: #333;
  //         margin-bottom: 20px;
  //       }

  //       .swal2-popup .product-container {
  //         display: flex;
  //         justify-content: space-between;
  //         align-items: center;
  //         padding: 20px;
  //         border: 1px solid #ddd;
  //         border-radius: 12px;
  //         margin: 10px 0;
  //         background: #ffffff;
  //         box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  //         transition: transform 0.3s ease-in-out;
  //       }

  //       .swal2-popup .product-container:hover {
  //         transform: scale(1.02);
  //       }

  //       .swal2-popup .product-details {
  //         color: #555;
  //         font-size: 16px;
  //         font-weight: 600;
  //       }

  //       .swal2-popup .quantity-controls {
  //         display: flex;
  //         align-items: center;
  //       }

  //       .swal2-popup .btn-increase, .swal2-popup .btn-decrease {
  //         background-color: #4CAF50;
  //         color: white;
  //         border: none;
  //         border-radius: 50%;
  //         padding: 8px 12px;
  //         cursor: pointer;
  //         margin: 0 10px;
  //         transition: background-color 0.3s ease-in-out, transform 0.2s ease-in-out;
  //         font-size: 18px;
  //       }

  //       .swal2-popup .btn-increase:hover, .swal2-popup .btn-decrease:hover {
  //         background-color: #45a049;
  //         transform: scale(1.1);
  //       }

  //       .swal2-popup .btn-decrease {
  //         background-color: #dc3545;
  //       }

  //       .swal2-popup .btn-decrease:hover {
  //         background-color: #c82333;
  //       }

  //       .swal2-popup .product-quantity {
  //         font-size: 18px;
  //         color: #333;
  //         font-weight: 500;
  //         margin: 0 5px;
  //       }

  //       .swal2-popup #search {
  //         padding: 12px;
  //         border: 1px solid #ccc;
  //         border-radius: 25px;
  //         width: calc(100% - 24px);
  //         margin-bottom: 20px;
  //         box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  //         font-size: 16px;
  //       }

  //       .swal2-popup #search:focus {
  //         border-color: #007bff;
  //         outline: none;
  //       }

  //       .swal2-popup .product-list-container {
  //         max-height: 400px;
  //         overflow-y: auto;
  //         width: 100%;
  //       }

  //       .swal2-popup .swal2-cancel {
  //         background-color: #f0f0f0;
  //         border-color: #ccc;
  //       }

  //       .swal2-popup .swal2-confirm {
  //         background-color: #007bff;
  //         color: white;
  //         border-radius: 5px;
  //       }

  //       .swal2-popup .swal2-confirm:hover {
  //         background-color: #0056b3;
  //       }
  //     </style>
  //     <div style="width: 100%;">
  //       <input type="text" id="search" class="swal2-input" placeholder="Search products..." />
  //       <div class="product-list-container">
  //         ${this.filteredProducts.map(product => `
  //           <div class="product-container">
  //             <div class="product-details">
  //               ${product.name} - ${product.price} MAD
  //             </div>
  //             <div class="quantity-controls">
  //               <button class="btn-increase" data-id="${product.id}">+</button>
  //               <span class="product-quantity" id="qty-${product.id}">${product.qty}</span>
  //               <button class="btn-decrease" data-id="${product.id}" ${product.qty === 0 ? 'disabled' : ''}>-</button>
  //             </div>
  //           </div>
  //         `).join('')}
  //       </div>
  //     </div>
  //   `;
  // }
  renderSwal() {
    Swal.fire({
        title: 'Select Products',
        html: this.getProductSelectionHtml(),
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Add to Cart',
        cancelButtonText: 'Close',
        preConfirm: () => {
            const selectedProducts = this.availableProducts.filter(product => product.qty > 0);
            this.addSelectedProducts(selectedProducts);
        },
        didOpen: () => {
            this.bindQuantityButtons();
            this.bindSearchFunctionality();
        }
    }).then(() => {
        this.availableProducts.forEach(product => product.qty = 0);
    });
}

getProductSelectionHtml() {
    return `
        <style>
            .swal2-popup {
                font-family: 'Roboto', sans-serif;
                width: 600px !important;
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
        </style>
        <div style="width: 100%;">
            <input type="text" id="search" class="swal2-input" placeholder="Search products..." />
            <div class="product-list-container" id="product-list">
                ${this.filteredProducts.map(product => `
                    <div class="product-container" data-name="${product.name}">
                        <div class="product-details">
                            ${product.name} - ${product.price} MAD
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
  const searchInput = document.getElementById('search') as HTMLInputElement; // Cast to HTMLInputElement
  const productList = document.getElementById('product-list') as HTMLElement; // Cast to HTMLElement
  searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.toLowerCase();
      const products = productList.querySelectorAll('.product-container');

      products.forEach((product) => {
          const productElement = product as HTMLElement; // Cast to HTMLElement
          const productName = productElement.getAttribute('data-name')?.toLowerCase() || '';
          if (productName.includes(searchTerm)) {
              productElement.style.display = ''; // Show product
          } else {
              productElement.style.display = 'none'; // Hide product
          }
      });
  });
}


  bindQuantityButtons() {
    const increaseButtons = document.querySelectorAll('.btn-increase');
    const decreaseButtons = document.querySelectorAll('.btn-decrease');

    increaseButtons.forEach(button => {
      button.addEventListener('click', (event: any) => {
        const productId = event.target.getAttribute('data-id');
        const product = this.availableProducts.find(p => p.id == productId);
        if (product) {
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
  }



  // saveOrder() {
  //   if (!this.selectedCustomerId) {
  //     Swal.fire('Error', 'Please select a customer before saving the order.', 'error');
  //     return;
  //   }

  //   const order = {
  //     customerId: this.selectedCustomerId,
  //     products: this.cartData.map(product => ({
  //       productId: product.productId,
  //       quantity: product.qty
  //     }))
  //   };

  //   axios.post('http://localhost:8044/api/orders', order)
  //     .then(response => {
  //       Swal.fire('Success', 'Order saved successfully!', 'success');
  //       this.cartData = []; // Clear cart after saving if needed
  //       this.selectedCustomerId = null; // Reset selected customer
  //     })
  //     .catch(error => {
  //       console.error('Error saving order:', error);
  //       Swal.fire('Error', 'There was an error saving the order.', 'error');
  //     });
  // }
  saveOrder() {
    if (!this.selectedCustomerId) {
      Swal.fire('Error', 'Please select a customer before saving the order.', 'error');
      return;
    }

    const order = {
      customerId: this.selectedCustomerId,
      products: this.cartData.map(product => ({
        productId: product.productId,
        quantity: product.qty
      }))
    };

    axios.post('http://localhost:8044/api/orders', order)
      .then(response => {
        Swal.fire('Success', 'Order saved successfully!', 'success');
        this.cartData = []; // Clear cart after saving if needed
      //  this.selectedCustomerId = null; // Reset selected customer

        // Proceed to make payment if order saved successfully
        if (this.paymentAmount && this.paymentAmount > 0) {
          return axios.post(`http://localhost:8044/api/orders/makePaymentByCustomer/${this.selectedCustomerId}?paymentAmount=${this.paymentAmount}`)
            .then(paymentResponse => {
              Swal.fire('Success', 'Payment made successfully!', 'success');
              this.paymentAmount = null; // Reset payment amount
            })
            .catch(paymentError => {
              console.error('Error processing payment:', paymentError);
              Swal.fire('Error', 'There was an error processing the payment.', 'error');
            });
        }
        // Navigate to product list after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/ecommerce/orders']);
        }, 2000);
      })
      .catch(error => {
        console.error('Error saving order:', error);
        Swal.fire('Error', 'There was an error saving the order.', 'error');
      });
  }

}
