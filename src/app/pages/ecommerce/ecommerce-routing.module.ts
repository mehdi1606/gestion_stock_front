import { FournisseursComponent } from './customers/fournisseurs.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ArticlesComponent } from './products/articles.component';

import { CustomerOrdersComponent } from './customer-orders/customer-orders.component';
import { StockInventoryComponent } from './stock-inventory/stock-inventory.component';
import { StockMovementsComponent } from './orders/stock-movements.component';

const routes: Routes = [
      {
          path: 'articles',
          component: ArticlesComponent
      },
    { path: 'customer-orders/:customerId', component: CustomerOrdersComponent },
    {
        path: 'Inventory',
        component: StockInventoryComponent
    },

    {
        path: 'fournisseurs',
        component: FournisseursComponent
    },
    {
        path: 'Stock',
          component: StockMovementsComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class EcommerceRoutingModule { }
