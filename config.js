export const CONFIG = {
  appName: "Beji Healing",
  currency: "IDR",
  locale: "en-ID",
  apiBaseUrl: "/api/v1",
  defaultRoute: "home",
  paymentProviders: ["midtrans", "hitpay", "ottopay"],
  imageBase: "https://images.unsplash.com",
  contact: {
    email: "reservations@bejihealing.com",
    phone: "+62 361 880 214",
    address: "Ubud Forest Sanctuary, Bali"
  }
};

export const ROUTES = {
  home: { title: "Home", path: "pages/home.html", layout: "main" },
  about: { title: "About", path: "pages/about.html", layout: "main" },
  healers: { title: "Healers", path: "pages/healers.html", layout: "main" },
  programs: { title: "Programs", path: "pages/programs.html", layout: "main" },
  booking: { title: "Booking", path: "pages/booking.html", layout: "main" },
  schedule: { title: "Schedule", path: "pages/schedule.html", layout: "main" },
  gallery: { title: "Gallery", path: "pages/gallery.html", layout: "main" },
  blog: { title: "Journal", path: "pages/blog.html", layout: "main" },
  contact: { title: "Contact", path: "pages/contact.html", layout: "main" },
  dashboard: { title: "Dashboard", path: "pages/dashboard.html", layout: "dashboard" },
  customers: { title: "Customers", path: "pages/customers.html", layout: "dashboard" },
  finance: { title: "Finance", path: "pages/finance.html", layout: "dashboard" },
  reports: { title: "Reports", path: "pages/reports.html", layout: "dashboard" },
  pos: { title: "POS", path: "pages/pos.html", layout: "dashboard" },
  inventory: { title: "Inventory", path: "pages/inventory.html", layout: "dashboard" },
  settings: { title: "Settings", path: "pages/settings.html", layout: "dashboard" },
  login: { title: "Login", path: "pages/login.html", layout: "auth" }
};
