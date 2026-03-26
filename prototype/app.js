const titleMap = {
  overview: "Overblik",
  requests: "Kundebestillinger",
  "request-detail": "Ordredetalje",
  "purchase-orders": "Leverandørordre",
  "customer-invoicing": "Fakturering til kunde",
  inbox: "Mailindbakke",
  products: "Varekatalog",
};

const navLinks = document.querySelectorAll(".nav-link");
const views = document.querySelectorAll(".view");
const title = document.getElementById("view-title");
const detailTriggers = document.querySelectorAll(".goto-detail");

function showView(viewName) {
  navLinks.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  views.forEach((view) => {
    view.classList.toggle("active", view.id === `view-${viewName}`);
  });

  title.textContent = titleMap[viewName] || "Varebestilling";
}

navLinks.forEach((button) => {
  button.addEventListener("click", () => {
    showView(button.dataset.view);
  });
});

detailTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    showView("request-detail");
  });
});
