  // customers.component.ts
  import { Component, OnInit } from '@angular/core';
  import { FormBuilder, FormGroup, Validators } from '@angular/forms';
  import axios from 'axios';
  import Swal from 'sweetalert2';
  import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';

  interface Customer {
    id?: number;
    name: string;
    email: string;
    tele: string;
    localisation: string;
    remainingAmount?: number;
    dueDate?: string;
  }

  @Component({
    selector: 'app-customers',
    templateUrl: './customers.component.html',
    styleUrls: ['./customers.component.scss']
  })
  export class CustomersComponent implements OnInit {
    customers: Customer[] = [];
    formData: FormGroup;
    submitted = false;
    term: string = '';
    modalRef?: BsModalRef;
    selectedCustomerId?: number;

    constructor(
      private modalService: BsModalService,
      private formBuilder: FormBuilder
    ) {
      this.formData = this.formBuilder.group({
        name: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        tele: ['', [Validators.required]],
        localisation: ['', [Validators.required]],
        remainingAmount: [0],
        dueDate: ['']
      });
    }

    ngOnInit(): void {
      this.fetchCustomers();
    }

    // Fetch all customers
    async fetchCustomers() {
      try {
        const response = await axios.get('http://localhost:8044/api/customers/all');
        this.customers = response.data.map((customer: any) => ({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          tele: customer.tele,
          localisation: customer.localisation,
          remainingDebt: customer.remainingDebt ,
          totalOrders: customer.totalOrders
        }));
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    }

    // Open modal for new or edit
    openModal(content: any, customer?: Customer) {
      this.submitted = false;
      this.modalRef = this.modalService.show(content);
      if (customer) {
        this.selectedCustomerId = customer.id;
        this.formData.patchValue(customer);
      } else {
        this.formData.reset();
        this.selectedCustomerId = undefined;
      }
    }

    // Save or update customer
    async saveCustomer() {
      this.submitted = true;
      if (this.formData.invalid) return;

      const customerData: Customer = this.formData.value;

      try {
        if (this.selectedCustomerId) {
          await axios.post(`http://localhost:8044/api/customers/save`, { id: this.selectedCustomerId, ...customerData });
        } else {
          await axios.post(`http://localhost:8044/api/customers/save`, customerData);
        }
        this.fetchCustomers();
        this.modalRef?.hide();
      } catch (error) {
        console.error('Error saving customer:', error);
      }
    }

    // Delete customer
    async deleteCustomer(id: number) {
      Swal.fire({
        title: 'Are you sure?',
        text: 'You won\'t be able to revert this!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'No, cancel!'
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await axios.delete(`http://localhost:8044/api/customers/${id}`);
            this.fetchCustomers();
            Swal.fire('Deleted!', 'Customer has been deleted.', 'success');
          } catch (error) {
            console.error('Error deleting customer:', error);
          }
        }
      });
    }
    async makePayment(customerId: number) {
      const { value: paymentAmount } = await Swal.fire({
        title: '<strong style="color: #4a90e2; font-size: 22px;">Make Payment</strong>',  // Styled title
        html: `<p style="color: #555; font-size: 16px;">Enter the amount you wish to pay:</p>`,  // Styled message
        input: 'number',
        inputLabel: 'Payment Amount',
        inputPlaceholder: 'Enter amount',
        inputAttributes: {
          min: '0',
          step: 'any'
        },
        background: '#f0f9ff', // Light blue background for a soft feel
        confirmButtonText: '<i class="fa fa-check"></i> Confirm Payment',
        confirmButtonColor: '#6a1b9a', // Custom color for the confirm button
        cancelButtonText: '<i class="fa fa-times"></i> Cancel',
        cancelButtonColor: '#e57373', // Softer color for cancel button
        showCancelButton: true,
        buttonsStyling: true,
        customClass: {
          popup: 'swal2-popup-custom',  // Custom popup class
          confirmButton: 'swal2-confirm-custom',  // Custom confirm button class
          cancelButton: 'swal2-cancel-custom'  // Custom cancel button class
        },
        inputValidator: (value) => {
          if (!value || isNaN(Number(value)) || Number(value) <= 0) {
            return 'Please enter a valid payment amount!';
          }
        }
      });

      if (paymentAmount) {
        const amount = Number(paymentAmount);
        try {
          await axios.post(`http://localhost:8044/api/orders/makePaymentByCustomer/${customerId}?paymentAmount=${amount}`);
          Swal.fire('Success!', 'Payment has been made.', 'success');
          this.fetchCustomers();
        } catch (error) {
          console.error('Error making payment:', error);
          Swal.fire('Error!', 'There was an error processing the payment.', 'error');
        }
      }
    }

    // Filter customers by name
    filterCustomers() {
      if (this.term) {
        this.customers = this.customers.filter(customer =>
          customer.name.toLowerCase().includes(this.term.toLowerCase())
        );
      } else {
        this.fetchCustomers();
      }
    }

    get form() {
      return this.formData.controls;
    }
  }
