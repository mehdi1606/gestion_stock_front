import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, Validators, UntypedFormGroup } from '@angular/forms';
import axios from 'axios';
import { DropzoneConfigInterface } from 'ngx-dropzone-wrapper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-addproduct',
  templateUrl: './addproduct.component.html',
  styleUrls: ['./addproduct.component.scss']
})

export class AddproductComponent implements OnInit {

  productAdded: boolean = false;

  constructor(
    public formBuilder: UntypedFormBuilder,
    private snackBar: MatSnackBar,
    private router: Router
  ) { }

  productForm: UntypedFormGroup;
  breadCrumbItems: Array<{}>;
  submit: boolean = false;
  uploadedFiles: any[] = [];  // Store uploaded files including dataURL

  ngOnInit() {
    this.breadCrumbItems = [{ label: 'Ecommerce' }, { label: 'Add Product', active: true }];

    this.productForm = this.formBuilder.group({
      nom: ['', [Validators.required, Validators.pattern('[a-zA-Z0-9 ]+')]], // Changed to 'nom' to match backend entity
      price: ['', [Validators.required]],
      category: ['', [Validators.required]],
      description: ['', [Validators.required]]
    });
  }

  get form() {
    return this.productForm.controls;
  }

  /**
   * Axios form submit method
   */
  validSubmit() {
    this.submit = true;

    if (this.productForm.invalid) {
      return;
    }

    // Get the image as a base64 string (assuming the first uploaded image is used)
    const imageString = this.uploadedFiles.length > 0 ? this.uploadedFiles[0].dataURL.split(',')[1] : '';

    const formData = {
      nom: this.productForm.get('nom').value,
      price: this.productForm.get('price').value,
      category: this.productForm.get('category').value,
      description: this.productForm.get('description').value,
    };

    axios.post('http://localhost:8044/api/products', formData)
      .then((response) => {
        console.log('Product created successfully', response.data);
        this.productAdded = true;

        // Display a success message using MatSnackBar
        this.snackBar.open('Product added successfully!', 'Close', {
          duration: 3000,
          verticalPosition: 'top'
        });

        // Navigate to product list after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/ecommerce/products']);
        }, 2000);
      })
      .catch((error) => {
        if (error.response) {
          console.error('Error response:', error.response);
          this.snackBar.open(`Error ${error.response.status}: ${error.response.data.message || 'There was an error creating the product.'}`, 'Close', {
            duration: 5000,
            verticalPosition: 'top'
          });
        } else if (error.request) {
          console.error('Error request:', error.request);
          this.snackBar.open('No response received from the server. Please try again later.', 'Close', {
            duration: 5000,
            verticalPosition: 'top'
          });
        } else {
          console.error('Error', error.message);
          this.snackBar.open(`Error: ${error.message}`, 'Close', {
            duration: 5000,
            verticalPosition: 'top'
          });
        }
      });
  }

  // File Upload Configuration
  public dropzoneConfig: DropzoneConfigInterface = {
    clickable: true,
    addRemoveLinks: true,
    previewsContainer: false,
    acceptedFiles: null,
    maxFilesize: 1, // Limit file size to 1MB
    maxFiles: 1 // Limit to one file for simplicity
  };

  onUploadSuccess(event: any) {
    setTimeout(() => {
      if (event && event[0]) {
        this.uploadedFiles.push(event[0]);  // Save the file with its dataURL
        console.log('File uploaded successfully:', event[0]);
      }
    }, 100);
  }

  // File Remove
  removeFile(event: any) {
    this.uploadedFiles.splice(this.uploadedFiles.indexOf(event), 1);
  }

  onCancel() {
    this.productForm.reset();
    this.uploadedFiles = []; // Clear uploaded files
    this.submit = false;
  }
}
