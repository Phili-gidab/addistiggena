/**
 * Geographic coverage - the 11 sub-cities of Addis Ababa and their
 * neighbourhood mapping, from the official "Geographic Coverage" document
 * (for app design and call-center data). Lemi Kura added per client
 * first-round review (Aug 2026).
 */

export interface SubCity {
  name: string;
  nameAm: string;
  neighborhoods: string[];
}

export const SUB_CITIES: SubCity[] = [
  {
    name: 'Bole',
    nameAm: 'ቦሌ',
    neighborhoods: [
      'Bole Medhanialem',
      'Bole Atlas',
      'Bole Rwanda',
      'Bole Bulbula',
      'Bole Mikael',
      'Gerji Mebrat Hail',
      'Imperial side',
      'CMC',
      'Ayat',
      'Summit',
      'Goro',
    ],
  },
  {
    name: 'Yeka',
    nameAm: 'የካ',
    neighborhoods: [
      'Yeka Abado',
      'Yeka Michael',
      'Lamberet',
      'Wosen',
      'Ayat',
      'Meri',
      'Lem Hotel',
      'Anbessa Garaj',
      'Kara Kore',
      'Shola',
      'Gurdi Shola',
      'Shola Gebeya',
      'Kotebe',
      'Kotebe University area',
      'Kotebe 01/02',
      'Kotebe police college surroundings',
      'Civil service area',
      'Ayat roundabout',
      'Zerihun building',
    ],
  },
  {
    name: 'Kirkos',
    nameAm: 'ቂርቆስ',
    neighborhoods: [
      'Meskel Square area',
      'Kazanchis',
      'Africa Avenue (Bole Road)',
      'Wello Sefer',
      'Gotera',
      'Agona',
      'Olympiya',
      'Bambis',
      'Urael',
    ],
  },
  {
    name: 'Lideta',
    nameAm: 'ልደታ',
    neighborhoods: [
      'Lideta',
      'Abnet',
      'Teklehaimanot',
      'Mexico Square',
      'Sarbet',
      'Gofa Camp direction',
      'Around St. Lideta Church',
    ],
  },
  {
    name: 'Arada',
    nameAm: 'አራዳ',
    neighborhoods: [
      'Piassa',
      'Arat Kilo',
      'Sidist Kilo',
      'Cherkos',
      'Entoto road areas',
      'Ras Mekonnen Bridge',
      'Around National Theater',
    ],
  },
  {
    name: 'Addis Ketema',
    nameAm: 'አዲስ ከተማ',
    neighborhoods: [
      'Mercato',
      'Sebategna',
      'Autobis Tera',
      'Minalesh Tera',
      'Ashewa Meda',
      'Kolfe bridge side',
    ],
  },
  {
    name: 'Gullele',
    nameAm: 'ጉለሌ',
    neighborhoods: [
      'Shiro Meda',
      'Entoto',
      'Addisu Gebeya',
      'Mebrat Hail (upper areas)',
      'Gullele Botanical Garden area',
      'Hamle 19 Park surroundings',
    ],
  },
  {
    name: 'Kolfe Keranio',
    nameAm: 'ኮልፌ ቀራንዮ',
    neighborhoods: ['Kolfe', 'Ayer Tena', 'Bethel', 'Tor Hailoch', 'Kara', 'Keranio', 'Repi'],
  },
  {
    name: 'Nifas Silk-Lafto',
    nameAm: 'ንፋስ ስልክ-ላፍቶ',
    neighborhoods: [
      'Jemo 1 condominium',
      'Jemo 2 condominium',
      'Jemo 3 condominium',
      'Lafto',
      'Saris',
      'Lebu',
      'Haile Garment',
      'Gofa',
      'Mebrathail',
    ],
  },
  {
    name: 'Lemi Kura',
    nameAm: 'ለሚ ኩራ',
    neighborhoods: [
      'Bole Arabsa',
      'Yeka Abado condominiums',
      'Tafo',
      'Meri',
      'Ayat Zone 8',
      'Alem Bank direction',
    ],
  },
  {
    name: 'Akaky Kaliti',
    nameAm: 'አቃቂ ቃሊቲ',
    neighborhoods: [
      'Akaky',
      'Kaliti',
      'Gelan Gura',
      'Tulu Dimtu',
      'Kilinto',
      'Industrial Zone areas',
      'Koye Feche condominium',
      'Alem Bank',
      'Akaki 08',
      'Akaki 09',
      'Cafdem Akebabi',
      'Kaliti Menaharia',
    ],
  },
];
