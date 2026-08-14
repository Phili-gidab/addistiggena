import type { Metadata } from 'next';
import { Inter, Montserrat, Noto_Sans_Ethiopic } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
});
const sansEthiopic = Noto_Sans_Ethiopic({
  subsets: ['ethiopic'],
  weight: ['400', '500', '700'],
  variable: '--font-sans-ethiopic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Addis Tiggena — አዲስ ጥገና · Connect. Fix. Care.',
  description:
    'Addis Tiggena connects you with verified maintenance technicians across all 10 sub-cities of Addis Ababa — electrical, plumbing, appliances, IT, carpentry and more. Average arrival 15–30 minutes, 5-day service guarantee, open 6:00 AM – 8:00 PM every day. A project of Amnen Marketing & Promotion.',
  icons: { icon: '/logo.png', apple: '/logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="am"
      className={`${inter.variable} ${montserrat.variable} ${sansEthiopic.variable}`}
    >
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
