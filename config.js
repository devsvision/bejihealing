export const CONFIG = {
  appName: "Beji Healing",
  currency: "IDR",
  locale: "en-ID",
  apiBaseUrl: "/api/v1",
  defaultRoute: "home",
  paymentProviders: ["midtrans", "hitpay", "ottopay"],
  imageBase: "https://images.unsplash.com",
  seo: {
    title: "Beji Healing - Begin Your Healing Journey",
    description: "Experience authentic Balinese healing traditions in Bali. Book purification rituals, blessing ceremonies, palm reading, sound healing, meditation, and wellness retreat packages at Beji Healing.",
    canonicalUrl: "https://www.bejihealing.com/",
    image: "https://www.bejihealing.com/assets/images/beji-healing-footer-logo.webp",
    keywords: [
      "Balinese healing",
      "healing retreat Bali",
      "spiritual healing Bali",
      "Ubud healing retreat",
      "purification ritual Bali",
      "Balinese healer",
      "wellness retreat Bali",
      "melukat Bali",
      "sound healing Bali",
      "meditation Bali"
    ]
  },
  contact: {
    email: "info@bejihealing.com",
    phone: "+62 813 9788 886",
    address: "Jl. Barong No.17, Dauh Yeh Cani, Kec. Abiansemal, Kabupaten Badung, Bali 80352",
    latitude: -8.523365685372884,
    longitude: 115.19991827116417
  }
};

export const ROUTES = {
  home: { title: "Home", seoTitle: "Beji Healing - Begin Your Healing Journey", path: "pages/home.html", layout: "main" },
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
