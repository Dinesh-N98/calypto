"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "./CartProvider";
const links = [
  ["Shop", "/shop"],
  ["About Us", "/about"],
  ["Wholesale", "/wholesale"],
  ["Contact", "/contact"],
];
export function Header() {
  const [open, setOpen] = useState(false);
  const { itemCount } = useCart();
  return (
    <header className="site-header">
      <Link className="logo" href="/">
        CALYPTO<span>®</span>
      </Link>
      <nav className="desktop-nav">
        {links.map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link className="cart-link" href="/cart">
          Cart <b>{itemCount}</b>
        </Link>
        <button className="menu-button" onClick={() => setOpen(true)} aria-label="Open menu">
          ☰
        </button>
      </div>
      {open && (
        <div className="mobile-menu">
          <button className="close-button" onClick={() => setOpen(false)} aria-label="Close menu">
            ×
          </button>
          <span className="menu-kicker">CAST WITH INTENT</span>
          {links.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <Link href="/cart" onClick={() => setOpen(false)}>
            Cart ({itemCount})
          </Link>
        </div>
      )}
    </header>
  );
}
