export const tourSteps = {
  admin: [
    {
      selector: '[data-tour="sidebar-nav"]',
      title: "Your navigation",
      body: "Everything you need as a PDMA officer lives here — drought monitoring, alerts, users, complaints, and verification requests.",
    },
    {
      selector: '[data-tour="district-search"]',
      title: "Jump to any district",
      body: "Search by name to see full satellite stats, trends, and complaints for that district. Recently viewed districts show up here too.",
    },
    {
      selector: '[data-tour="notifications"]',
      title: "Stay on top of alerts",
      body: "New drought alerts show up here as they're dispatched — click to see the full list.",
    },
    {
      selector: '[data-tour="main-content"]',
      title: "You're all set",
      body: "This is where each page's content lives. Press Ctrl+K anytime to jump to a page or district instantly.",
    },
  ],
  farmer: [
    {
      selector: '[data-tour="sidebar-nav"]',
      title: "Everything for your farm",
      body: "Crop recommendations, an irrigation schedule, yield risk, and a place to file complaints if drought damages your crop.",
    },
    {
      selector: '[data-tour="district-search"]',
      title: "Check other districts too",
      body: "While your home screen focuses on your own district, you can search any district to see its status.",
    },
    {
      selector: '[data-tour="notifications"]',
      title: "Drought alerts",
      body: "Your district's alerts from PDMA show up here as soon as they're sent.",
    },
    {
      selector: '[data-tour="main-content"]',
      title: "You're ready to go",
      body: "That's the tour! Press Ctrl+K anytime for quick access to any page.",
    },
  ],
  public: [
    {
      selector: '[data-tour="sidebar-nav"]',
      title: "Explore drought data",
      body: "View the regional map, compare districts, read community reports, and find water-conservation tips.",
    },
    {
      selector: '[data-tour="district-search"]',
      title: "Search any district",
      body: "Curious about a specific area? Search it here to see its current drought status.",
    },
    {
      selector: '[data-tour="notifications"]',
      title: "Regional alerts",
      body: "Drought alerts for your district appear here.",
    },
    {
      selector: '[data-tour="main-content"]',
      title: "That's it!",
      body: "You're all set to explore. Press Ctrl+K anytime for quick navigation.",
    },
  ],
};
