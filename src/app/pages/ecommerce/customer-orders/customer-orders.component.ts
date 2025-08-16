import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import axios from 'axios';
import Swal from 'sweetalert2';

interface Customer {
  id: number;
  name: string;
  orders: any[];
}

@Component({
  selector: 'app-customer-orders',
  templateUrl: './customer-orders.component.html',
  styleUrls: ['./customer-orders.component.scss']
})
export class CustomerOrdersComponent implements OnInit {
  customerId: number = 0;
  customerOrders: any[] = [];
  customerName: string = '';
  totalAmount: number = 0;
  amountPaid: number = 0;
  remainingAmount: number = 0;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const customerId = this.route.snapshot.paramMap.get('customerId');
    if (customerId) {
      this.customerId = +customerId;
      this.fetchCustomerAndOrders();
    } else {
      console.error('No customer ID provided');
      Swal.fire('Error!', 'No customer ID provided.', 'error');
    }
  }

  async fetchCustomerAndOrders() {
    try {
      const response = await axios.get<Customer>(`http://localhost:8044/api/customers/${this.customerId}`);

      if (response.data) {
        this.customerName = response.data.name || 'Unknown Customer';

        // Handle orders based on response structure
        if (Array.isArray(response.data.orders)) {
          this.customerOrders = response.data.orders;
        } else if (Array.isArray(response.data)) {
          this.customerOrders = response.data;
        } else {
          this.customerOrders = [];
          console.warn('No orders found');
        }

        if (this.customerOrders.length > 0) {
          this.calculateTotals();
        }
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      this.customerOrders = [];
      Swal.fire('Error!', 'There was an error fetching the customer data.', 'error');
    }
  }

  calculateTotals() {
    if (!Array.isArray(this.customerOrders) || this.customerOrders.length === 0) {
      this.totalAmount = 0;
      this.amountPaid = 0;
      this.remainingAmount = 0;
      return;
    }

    this.totalAmount = this.customerOrders.reduce(
      (sum, order) => sum + (Number(order.totalAmount) || 0),
      0
    );

    this.amountPaid = this.customerOrders.reduce(
      (sum, order) => sum + (Number(order.amountPaid) || 0),
      0
    );

    this.remainingAmount = this.totalAmount - this.amountPaid;
  }
  async showPaymentHistory() {
    try {
      const response = await axios.get(`http://localhost:8044/api/orders/payment-history/${this.customerId}`);
      const paymentHistory = response.data;

      if (!Array.isArray(paymentHistory) || paymentHistory.length === 0) {
        Swal.fire('📭 Aucune donnée', 'Aucun paiement trouvé pour ce client.', 'info');
        return;
      }

      try {
        const historyHtml = paymentHistory.map((payment: any, index: number) => `
          <tr>
        <td>${index + 1}</td>
        <td>${payment.paymentDate || '-'}</td>
        <td>${payment.paymentAmount} MAD</td>
        <td>${payment.typeOfPayment}</td>
          </tr>
        `).join('');

        const htmlContent = `
          <div style="max-height: 300px; overflow-y: auto;">
            <table class="table table-bordered">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                ${historyHtml}
              </tbody>
            </table>
          </div>
        `;

        Swal.fire({
          title: '🧾 Historique des Paiements',
          html: htmlContent,
          width: '600px',
          showCloseButton: true,
          confirmButtonText: 'Fermer',
          customClass: {
            popup: 'swal2-custom-popup'
          }
        });

      } catch (error) {
        console.error('Error loading payment history:', error);
        Swal.fire('Erreur', 'Impossible de charger l’historique des paiements.', 'error');
      }
    }

    catch (error) {
      console.error('Error loading payment history:', error);
      Swal.fire('Erreur', 'Impossible de charger l’historique des paiements.', 'error');
    }
  }
  async archiveCustomerOrders() {
    try {
      Swal.fire({
        title: '📦 Archiver les commandes',
        text: 'Êtes-vous sûr de vouloir archiver toutes les commandes payées?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Oui, archiver',
        cancelButtonText: 'Annuler'
      }).then(async (result) => {
        if (result.isConfirmed) {
          const response = await axios.post(`http://localhost:8044/api/orders/archive-customer-orders/${this.customerId}`);

          Swal.fire('✅ Succès', response.data, 'success');

          // Refresh the orders list
          this.fetchCustomerAndOrders();        }
      });
    } catch (error: any) {
      Swal.fire('❌ Erreur', error.response?.data || 'Impossible d\'archiver les commandes', 'error');
    }
  }

    async showArchivedOrders() {
      try {
        const response = await axios.get(`http://localhost:8044/api/orders/archived/${this.customerId}`);
        const archivedOrders = response.data;

        if (!Array.isArray(archivedOrders) || archivedOrders.length === 0) {
          Swal.fire('📭 Aucune donnée', 'Aucune commande archivée trouvée.', 'info');
          return;
        }

        // Display archived orders in a table (similar to payment history)
        const ordersHtml = archivedOrders.map((order: any, index: number) => `
          <tr>
            <td>${index + 1}</td>
            <td>${order.invoiceNumber}</td>
            <td>${order.dueDate}</td>
            <td>${order.totalAmount} MAD</td>
            <td><span class="badge bg-success">Payée</span></td>
          </tr>
        `).join('');

        const htmlContent = `
          <div style="max-height: 400px; overflow-y: auto;">
            <table class="table table-bordered">
              <thead>
                <tr>
                  <th>#</th>
                  <th>N° Facture</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                ${ordersHtml}
              </tbody>
            </table>
          </div>
        `;

        Swal.fire({
          title: '📋 Commandes Archivées',
          html: htmlContent,
          width: '800px',
          showCloseButton: true,
          confirmButtonText: 'Fermer'
        });
      } catch (error) {
        Swal.fire('❌ Erreur', 'Impossible de charger les commandes archivées', 'error');
      }
    }
}