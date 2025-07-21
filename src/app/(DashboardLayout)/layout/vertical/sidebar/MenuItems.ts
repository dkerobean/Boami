import { uniqueId } from "lodash";

interface MenuitemsType {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: string;
  children?: MenuitemsType[];
  chip?: string;
  chipColor?: string;
  variant?: string;
  external?: boolean;
}
import {
  IconAward,
  IconBoxMultiple,
  IconPoint,
  IconAlertCircle,
  IconNotes,
  IconCalendar,
  IconMail,
  IconTicket,
  IconEdit,
  IconGitMerge,
  IconCurrencyDollar,
  IconApps,
  IconFileDescription,
  IconFileDots,
  IconFiles,
  IconBan,
  IconStar,
  IconMoodSmile,
  IconBorderAll,
  IconBorderHorizontal,
  IconBorderInner,
  IconBorderVertical,
  IconBorderTop,
  IconUserCircle,
  IconPackage,
  IconMessage2,
  IconBasket,
  IconChartLine,
  IconChartArcs,
  IconChartCandle,
  IconChartArea,
  IconChartDots,
  IconChartDonut3,
  IconChartRadar,
  IconLogin,
  IconUserPlus,
  IconRotate,
  IconBox,
  IconShoppingCart,
  IconAperture,
  IconLayout,
  IconSettings,
  IconHelp,
  IconZoomCode,
  IconBoxAlignBottom,
  IconBoxAlignLeft,
  IconBorderStyle2,
  IconLockAccess,
  IconAppWindow,
  IconNotebook,
  IconFileCheck,
  IconFileInvoice,
  IconList,
  IconBuilding,
  IconChartBar,
  IconPlus,
  IconTruck,
  IconUpload,
  IconDownload,
  IconDatabase,
  IconCash,
  IconReceipt,
  IconTrendingUp,
  IconTag,
  IconRepeat,
  IconChartPie,
} from "@tabler/icons-react";

const Menuitems: MenuitemsType[] = [
  {
    navlabel: true,
    subheader: "Home",
  },


  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconShoppingCart,
    href: "/dashboards/ecommerce",
  },

  {
    navlabel: true,
    subheader: "Apps",
  },
  {
    id: uniqueId(),
    title: "Add Product",
    icon: IconPackage,
    href: "/apps/ecommerce/add-product",
  },
  {
    id: uniqueId(),
    title: "List",
    icon: IconFiles,
    href: "/apps/ecommerce/list",
  },
  {
    id: uniqueId(),
    title: "Shop",
    icon: IconShoppingCart,
    href: "/apps/ecommerce/shop",
  },
  {
    navlabel: true,
    subheader: "Inventory",
  },
  {
    id: uniqueId(),
    title: "Stock Alerts",
    icon: IconAlertCircle,
    href: "/apps/ecommerce/stock-alerts",
  },
  {
    id: uniqueId(),
    title: "Bulk Operations",
    icon: IconDatabase,
    href: "/apps/ecommerce/bulk-upload",
    children: [
      {
        id: uniqueId(),
        title: "Bulk Upload",
        icon: IconUpload,
        href: "/apps/ecommerce/bulk-upload",
      },
      {
        id: uniqueId(),
        title: "Bulk Export",
        icon: IconDownload,
        href: "/apps/ecommerce/bulk-export",
      },
      {
        id: uniqueId(),
        title: "Import from Wordpress",
        icon: IconUpload,
        href: "/apps/ecommerce/import-wordpress",
      },
    ],
  },

  


  {
    navlabel: true,
    subheader: "Productivity",
  },
  {
    id: uniqueId(),
    title: "Notes",
    icon: IconNotes,
    href: "/apps/notes",
  },
  {
    id: uniqueId(),
    title: "Calendar",
    icon: IconCalendar,
    href: "/apps/calendar",
  },
  {
    id: uniqueId(),
    title: "Kanban",
    icon: IconNotebook,
    href: "/apps/kanban",
  },

  {
    navlabel: true,
    subheader: "Invoice Management",
  },
  {
    id: uniqueId(),
    title: "All Invoices",
    icon: IconList,
    href: "/apps/invoice/list",
  },
  {
    id: uniqueId(),
    title: "Create Invoice",
    icon: IconPlus,
    href: "/apps/invoice/create",
  },
  {
    id: uniqueId(),
    title: "Pricing & Tax",
    icon: IconCurrencyDollar,
    href: "/apps/invoice/pricing",
  },
  {
    id: uniqueId(),
    title: "Company Settings",
    icon: IconBuilding,
    href: "/apps/invoice/company",
  },
  {
    id: uniqueId(),
    title: "Reports",
    icon: IconChartBar,
    href: "/apps/invoice/reports",
  },

  {
    navlabel: true,
    subheader: "Finance",
  },
  {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconChartPie,
    href: "/apps/finance/dashboard",
  },
  {
    id: uniqueId(),
    title: "Income",
    icon: IconCash,
    href: "/apps/finance/income",
  },
  {
    id: uniqueId(),
    title: "Expenses",
    icon: IconReceipt,
    href: "/apps/finance/expenses",
  },
  {
    id: uniqueId(),
    title: "Sales",
    icon: IconTrendingUp,
    href: "/apps/finance/sales",
  },
  {
    id: uniqueId(),
    title: "Categories",
    icon: IconTag,
    href: "/apps/finance/categories",
  },
  {
    id: uniqueId(),
    title: "Vendors",
    icon: IconBuilding,
    href: "/apps/finance/vendors",
  },
  {
    id: uniqueId(),
    title: "Recurring Payments",
    icon: IconRepeat,
    href: "/apps/finance/recurring",
  },

  {
    navlabel: true,
    subheader: "Pages",
  },
  {
    id: uniqueId(),
    title: "Roll Base Access",
    icon: IconLockAccess,
    href: "/theme-pages/casl",
  },
  {
    id: uniqueId(),
    title: "Treeview",
    icon: IconGitMerge,
    href: "/theme-pages/treeview",
  },
  {
    id: uniqueId(),
    title: "Pricing",
    icon: IconCurrencyDollar,
    href: "/theme-pages/pricing",
  },
  {
    id: uniqueId(),
    title: "Account Setting",
    icon: IconUserCircle,
    href: "/theme-pages/account-settings",
  },
  {
    id: uniqueId(),
    title: "FAQ",
    icon: IconHelp,
    href: "/theme-pages/faq",
  },
  {
    id: uniqueId(),
    title: "Landingpage",
    icon: IconAppWindow,
    href: "/landingpage",
  },
  {
    id: uniqueId(),
    title: "Widgets",
    icon: IconLayout,
    href: "/widgets/cards",
    children: [
      {
        id: uniqueId(),
        title: "Cards",
        icon: IconPoint,
        href: "/widgets/cards",
      },
      {
        id: uniqueId(),
        title: "Banners",
        icon: IconPoint,
        href: "/widgets/banners",
      },
      {
        id: uniqueId(),
        title: "Charts",
        icon: IconPoint,
        href: "/widgets/charts",
      },
    ],
  },
  
];

export default Menuitems;