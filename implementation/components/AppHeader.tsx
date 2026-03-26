import Link from "next/link";

const navItems = [
  { href: "/", label: "Overblik" },
  { href: "/orders", label: "Varebestilling" },
  { href: "/purchase-orders", label: "Leverandørordre" },
  { href: "/customer-invoicing", label: "Fakturering til kunde" },
];

export default function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div>
          <p className="app-kicker">Hvidbjerg Service</p>
          <h1 className="app-title">Bestillingssystem</h1>
        </div>

        <nav className="app-nav" aria-label="Hovednavigation">
          {navItems.map((item) => (
            <Link className="app-nav-link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
