import { FournisseursComponent } from './customers/fournisseurs.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ArticlesComponent } from './products/articles.component';
import { CartComponent } from './cart/cart.component';

import { OrdersComponent } from './orders/orders.component';
import { CustomerOrdersComponent } from './customer-orders/customer-orders.component';

const routes: Routes = [
    {
        path: 'articles',
        component: ArticlesComponent
    },
    { path: 'customer-orders/:customerId', component: CustomerOrdersComponent },
    {
        path: 'cart',
        component: CartComponent
    },

    {
        path: 'fournisseurs',
        component: FournisseursComponent
    },
    {
        path: 'orders',
          component: OrdersComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class EcommerceRoutingModule { }
