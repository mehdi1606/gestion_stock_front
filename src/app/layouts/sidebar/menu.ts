import { MenuItem } from './menu.model';

export const MENU: MenuItem[] = [
    {
        id: 1,
        label: 'MENUITEMS.MENU.TEXT',
        isTitle: true
    },
    {
        id: 2,
        label: 'MENUITEMS.DASHBOARDS.TEXT',
        icon: 'bx-home-circle',
         link: '/dashboard',

    },


          {
              id: 14,

              label: 'Produit',
              link: '/ecommerce/products',
              icon: 'bx bx-box', // Updated icon for "Produit"
              parentId: 13
          },

          {
            id: 16,
            label: 'Orders',
            link: '/ecommerce/orders',
            icon: 'bx bx-receipt', // Receipt icon for Orders
            parentId: 13
        },
        {
            id: 17,
            label: 'Clients',
            link: '/ecommerce/customers',
            icon: 'bx bx-user', // User icon for Clients
            parentId: 13
        }






   ];

