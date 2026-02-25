import './globals.css';

export const metadata = {
  title: "Aiswarya Sarees — Business Portal",
  description: "WhatsApp Business Management Portal for Aiswarya Sarees. Manage products, orders, customers, and invoices.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
