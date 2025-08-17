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
        label: 'Inventory',
        link: '/Inventory',
        icon: 'bx bx-package', // Inventory icon
        parentId: 13
    },
    {
        id: 16,
        label: 'Fournisseurs',
        link: '/fournisseurs',
        icon: 'bx bx-buildings', // Suppliers/Buildings icon
        parentId: 13
    },
    {
        id: 17,
        label: 'Stock',
        link: '/Stock',
        icon: 'bx bx-archive', // Archive/Stock icon
        parentId: 13
    },
    {
        id: 18,
        label: 'Articles',
        link: '/articles',
        icon: 'bx bx-list-ul', // List icon for Articles
        parentId: 13
    }
];