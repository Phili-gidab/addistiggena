import { Coverage } from '../components/home/Coverage';
import { Hero } from '../components/home/Hero';
import { ImageBand } from '../components/home/ImageBand';
import { Marquee } from '../components/home/Marquee';
import { PopularServices } from '../components/home/PopularServices';
import { ProBand } from '../components/home/ProBand';
import { Services } from '../components/home/Services';
import { Steps } from '../components/home/Steps';
import { Story } from '../components/home/Story';
import { Testimonials } from '../components/home/Testimonials';
import { Trust } from '../components/home/Trust';
import { API_URL, Category } from '../lib/api';
import { dict } from '../lib/i18n';
import { currentLang } from '../lib/lang';

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/catalog/categories`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    return (await res.json()) as Category[];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const categories = await getCategories();
  const lang = currentLang();
  const t = dict(lang);

  return (
    <main>
      <Hero categories={categories} t={t} lang={lang} />
      <Marquee />
      <Services categories={categories} t={t} />
      <PopularServices t={t} lang={lang} />
      <Steps t={t} />
      <ImageBand t={t} />
      <Trust t={t} />
      <Story t={t} />
      <Testimonials t={t} lang={lang} />
      <Coverage t={t} />
      <ProBand t={t} />
    </main>
  );
}
