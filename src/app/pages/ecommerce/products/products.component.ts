import { Component, OnInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {
  breadCrumbItems: Array<{}> = [];
  products: any[] = [];
  filteredProducts: any[] = [];
  filterPanelVisible: boolean = false;
  dropdownVisible: boolean = false;
  selectedCategory: string = 'All';
  distinctCategories: string[] = [];
  sortIconUp: boolean = true;
  sortBy: string = 'name';

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.breadCrumbItems = [
      { label: 'Ecommerce' },
      { label: 'Products', active: true }
    ];
    this.getProducts();
  }

  getProducts() {
    this.http.get('http://localhost:8044/api/products').subscribe(
      (response: any) => {
        this.products = response;
        this.filteredProducts = [...this.products];
        this.distinctCategories = [...new Set(this.products.map(product => product.category))];
      },
      error => {
        console.error('Failed to fetch products:', error);
      }
    );
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    // Close dropdown if clicked outside
    if (this.dropdownVisible && !target.closest('.position-relative')) {
      this.dropdownVisible = false;
    }
  }

  searchFilter(event: Event) {
    const searchStr = (event.target as HTMLInputElement).value.toLowerCase();
    this.applyFilters(searchStr, this.selectedCategory);
  }

  categoryFilter(category: string) {
    this.selectedCategory = category;
    this.applyFilters('', category);
  }

  applyFilters(searchStr: string, category: string) {
    this.filteredProducts = this.products.filter(product => {
      const matchesSearch = product.nom.toLowerCase().includes(searchStr);
      const matchesCategory = category === 'All' || product.category === category;
      return matchesSearch && matchesCategory;
    });
  }

  sortFilter(value: string) {
    this.sortBy = value;
    if (this.sortIconUp) {
      this.sortProducts(value, 'asc');
    } else {
      this.sortProducts(value, 'desc');
    }
    this.dropdownVisible = false; // Close dropdown after selection
  }

  sortProducts(key: string, order: string) {
    this.filteredProducts.sort((a, b) => {
      if (key === 'price') {
        return order === 'asc' ? a.price - b.price : b.price - a.price;
      } else if (key === 'name') {
        return order === 'asc' ? a.nom.localeCompare(b.nom) : b.nom.localeCompare(a.nom);
      }
      return 0;
    });
  }
  sortTable(column: string) {
    // If clicking the same column, toggle direction
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // If clicking new column, set it with ascending direction
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    // Sort the products
    this.filteredProducts.sort((a, b) => {
      let comparison = 0;

      switch (column) {
        case 'name':
          comparison = a.nom.localeCompare(b.nom);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        default:
          return 0;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) {
      return 'bx bx-sort';
    }
    return this.sortDirection === 'asc' ? 'bx bx-sort-up' : 'bx bx-sort-down';
  }

  toggleDropdown() {
    this.dropdownVisible = !this.dropdownVisible;
  }

  toggleSortIcon() {
    this.sortIconUp = !this.sortIconUp;
    if (this.sortIconUp) {
      this.sortProducts(this.sortBy, 'asc');
    } else {
      this.sortProducts(this.sortBy, 'desc');
    }
  }

  addProduct() {
    Swal.fire({
      title: '<h2 style="font-weight: bold; color: #4e73df; margin-bottom: 20px;">Add Product</h2>',
      html:

    `<div style="display: flex; flex-direction: column; width: 100%;">` +
        `<label for="swal-input1" style="font-weight: bold; margin-bottom: 5px;">Product Name:</label>` +
        `<input id="swal-input1" class="swal2-input" style="padding: 10px; border-radius: 5px; border: 1px solid #ccc; background-color: #f1f2f6;" placeholder="Product Name">` +
    `</div>` +
    `<div style="display: flex; flex-direction: column; width: 100%;">` +
        `<label for="swal-input2" style="font-weight: bold; margin-bottom: 5px;">Category:</label>` +
        `<select id="swal-input2" class="swal2-input" style="padding: 10px; border-radius: 5px; border: 1px solid #ccc; background-color: #f1f2f6; color: #6c757d;">` +
            `<option value="" disabled selected>Select Category</option>` +
            `<option value="Alimentaire">Alimentaire</option>` +
            `<option value="Cosmetique">Cosmetique</option>` +
            `<option value="Argan">Argan</option>` +
        `</select>` +
    `</div>` +
    `<div style="display: flex; flex-direction: column; width: 100%;">` +
        `<label for="swal-input3" style="font-weight: bold; margin-bottom: 5px;">Price:</label>` +
        `<input id="swal-input3" class="swal2-input" style="padding: 10px; border-radius: 5px; border: 1px solid #ccc; background-color: #f1f2f6;" type="number" placeholder="Price">` +
    `</div>` +
    `<div style="display: flex; flex-direction: column; width: 100%;">` +
        `<label for="swal-input4" style="font-weight: bold; margin-bottom: 5px;">Description:</label>` +
        `<textarea id="swal-input4" class="swal2-textarea" style="padding: 10px; border-radius: 5px; border: 1px solid #ccc; background-color: #f1f2f6;" placeholder="Description"></textarea>` +

`</div>`,

      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: '<span style="padding: 5px 20px;  color: #fff; border-radius: 5px;">✅ Add </span>',
      cancelButtonText: '<span style="padding: 5px 20px; background-color: #6c757d; color: #fff; border-radius: 5px;">❌ Cancel</span>',
      preConfirm: () => {
        const newName = (document.getElementById('swal-input1') as HTMLInputElement).value;
        const newCategory = (document.getElementById('swal-input2') as HTMLSelectElement).value;
        const newPrice = parseFloat((document.getElementById('swal-input3') as HTMLInputElement).value);
        const newDescription = (document.getElementById('swal-input4') as HTMLTextAreaElement).value;

        if (!newName || !newCategory || isNaN(newPrice)) {
          Swal.showValidationMessage('Please fill in all fields correctly');
          return null;
        }

        return {
          nom: newName,
          category: newCategory,
          price: newPrice,
          description: newDescription
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const newProduct = result.value;
        this.http.post('http://localhost:8044/api/products', newProduct).subscribe(
          (response: any) => {
            // Add new product locally
            this.products.push(response);
            this.filteredProducts = [...this.products];
            Swal.fire('<h3 style="color: green;">Added!</h3>', 'The product has been added.', 'success');
          },
          error => {
            console.error('Failed to add product:', error);
            Swal.fire('<h3 style="color: red;">Error!</h3>', 'Failed to add the product.', 'error');
          }
        );
      }
    });
  }




  editProduct(productId: number) {
    const product = this.products.find(p => p.id === productId);
    if (!product) {
      Swal.fire('Error!', 'Product not found.', 'error');
      return;
    }

    Swal.fire({
      title: '<h2 style="font-weight: bold; color: #4e73df; margin-bottom: 20px;">Edit Product</h2>',
      html:
        `<div style="display: flex; flex-direction: column; gap: 15px; padding: 10px;">` +
        `<div style="display: flex; flex-direction: column;">` +
        `<label for="swal-input1" style="font-weight: bold; margin-bottom: 5px;">Product Name:</label>` +
        `<input id="swal-input1" class="swal2-input" style="padding: 10px; border-radius: 5px; border: 1px solid #ddd;" placeholder="Product Name" value="${product.nom}"></div>` +
        `<div style="display: flex; flex-direction: column;">` +
        `<label for="swal-input2" style="font-weight: bold; margin-bottom: 5px;">Category:</label>` +
        `<select id="swal-input2" class="swal2-input" style="padding: 10px; border-radius: 5px; border: 1px solid #ddd; background-color: #f8f9fc; color: #6c757d;">` +
        `<option value="" disabled>Select Category</option>` +
        `<option value="Alimentaire" ${product.category === 'Alimentaire' ? 'selected' : ''}>Alimentaire</option>` +
        `<option value="Cosmetique" ${product.category === 'Cosmetique' ? 'selected' : ''}>Cosmetique</option>` +
        `<option value="Argan" ${product.category === 'Argan' ? 'selected' : ''}>Argan</option>` +
        `</select></div>` +
        `<div style="display: flex; flex-direction: column;">` +
        `<label for="swal-input3" style="font-weight: bold; margin-bottom: 5px;">Price:</label>` +
        `<input id="swal-input3" class="swal2-input" style="padding: 10px; border-radius: 5px; border: 1px solid #ddd;" type="number" placeholder="Price" value="${product.price}"></div>` +
        `<div style="display: flex; flex-direction: column;">` +
        `<label for="swal-input4" style="font-weight: bold; margin-bottom: 5px;">Description:</label>` +
        `<textarea id="swal-input4" class="swal2-textarea" style="padding: 10px; border-radius: 5px; border: 1px solid #ddd;" placeholder="Description">${product.description}</textarea></div>` +
        `</div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: '<span style="padding: 5px 20px; color: #fff; border-radius: 5px;">💾 Save</span>',
      cancelButtonText: '<span style="padding: 5px 20px; background-color: #6c757d; color: #fff; border-radius: 5px;">❌ Cancel</span>',
      preConfirm: () => {
        const updatedName = (document.getElementById('swal-input1') as HTMLInputElement).value;
        const updatedCategory = (document.getElementById('swal-input2') as HTMLSelectElement).value;
        const updatedPrice = parseFloat((document.getElementById('swal-input3') as HTMLInputElement).value);
        const updatedDescription = (document.getElementById('swal-input4') as HTMLTextAreaElement).value;

        if (!updatedName || !updatedCategory || isNaN(updatedPrice)) {
          Swal.showValidationMessage('Please fill in all fields correctly');
          return null;
        }

        return {
          nom: updatedName,
          category: updatedCategory,
          price: updatedPrice,
          description: updatedDescription
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const updatedProduct = result.value;
        this.http.put(`http://localhost:8044/api/products/${productId}`, updatedProduct).subscribe(
          () => {
            // Update product locally
            const productIndex = this.products.findIndex(p => p.id === productId);
            if (productIndex > -1) {
              this.products[productIndex] = { ...this.products[productIndex], ...updatedProduct };
              this.filteredProducts = [...this.products];
            }
            Swal.fire('<h3 style="color: green;">Updated!</h3>', 'The product has been updated.', 'success');
          },
          error => {
            console.error('Failed to update product:', error);
            Swal.fire('<h3 style="color: red;">Error!</h3>', 'Failed to update the product.', 'error');
          }
        );
      }
    });
  }




  deleteProduct(productId: number) {
    Swal.fire({
      title: 'Delete Product',
      text: 'Are you sure you want to delete this product?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, keep it'
    }).then(result => {
      if (result.isConfirmed) {
        this.http.delete(`http://localhost:8044/api/products/${productId}`).subscribe(
          () => {
            this.products = this.products.filter(product => product.id !== productId);
            this.filteredProducts = [...this.products];
            Swal.fire('Deleted!', 'The product has been deleted.', 'success');
          },
          error => {
            console.error('Failed to delete product:', error);
            Swal.fire('Error!', 'Failed to delete the product.', 'error');
          }
        );
      }
    });
  }
}
