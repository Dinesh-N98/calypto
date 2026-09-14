import Link from "next/link";
export function Footer() {
  return (
    <footer className="footer">
      <div>
        <Link className="logo" href="/">
          CALYPTO<span>®</span>
        </Link>
        <p>Soft plastics for serious water.</p>
      </div>
      <div>
        <h3>Shop</h3>
        <Link href="/shop">All baits</Link>
        <Link href="/shop?category=worm">Worm bait</Link>
        <Link href="/shop?category=tube">Tube bait</Link>
      </div>
      <div>
        <h3>Company</h3>
        <Link href="/about">Our story</Link>
        <Link href="/wholesale">Wholesale</Link>
        <Link href="/contact">Contact</Link>
      </div>
      <div>
        <h3>Follow us</h3>
        <a href="#instagram">Instagram ↗</a>
        <a href="#youtube">YouTube ↗</a>
        <a href="#email">hello@calypto.co</a>
      </div>
      <small>© 2026 Calypto. Built for the bite.</small>
    </footer>
  );
}
