import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: "Cast Prince — Business Portal",
  description: "WhatsApp Business Management Portal for Cast Prince. Manage products, orders, customers, and invoices.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
