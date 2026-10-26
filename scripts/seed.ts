import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as s from "../src/db/schema";

type V = { color: [string, string, string]; storage?: string; price: number; compare?: number; stock: number };
type P = {
  slug: string;
  name: string;
  brand: string;
  cat: string;
  fr: string;
  ar: string;
  specs: [string, string, string][];
  featured?: boolean;
  isNew?: boolean;
  variants: V[];
};

// `sort` follows the storefront menu order; array order only fixes the ids.
const categories = [
  { slug: "telephones", nameFr: "Téléphones", nameAr: "الهواتف", icon: "phone", sort: 1 },
  { slug: "tablettes", nameFr: "Tablettes", nameAr: "الأجهزة اللوحية", icon: "tablet", sort: 4 },
  { slug: "montres-connectees", nameFr: "Montres connectées", nameAr: "الساعات الذكية", icon: "watch", sort: 7 },
  { slug: "audio", nameFr: "Audio", nameAr: "الصوتيات", icon: "audio", sort: 8 },
  { slug: "laptops", nameFr: "Laptops", nameAr: "الحواسيب المحمولة", icon: "laptop", sort: 3 },
  { slug: "accessoires", nameFr: "Accessoires", nameAr: "الإكسسوارات", icon: "accessory", sort: 2 },
  { slug: "mobilite-electrique", nameFr: "Mobilité Électrique", nameAr: "التنقل الكهربائي", icon: "scooter", sort: 0 },
  { slug: "televiseurs", nameFr: "Téléviseurs", nameAr: "أجهزة التلفاز", icon: "tv", sort: 5 },
  { slug: "electromenagers", nameFr: "Électroménagers", nameAr: "الأجهزة المنزلية", icon: "home", sort: 6 },
];

const c = {
  black: ["Noir", "أسود", "#1c1c1e"] as [string, string, string],
  white: ["Blanc", "أبيض", "#f2f2f0"] as [string, string, string],
  titanium: ["Titane naturel", "تيتانيوم طبيعي", "#b8b2a7"] as [string, string, string],
  blue: ["Bleu", "أزرق", "#3b5b8c"] as [string, string, string],
  pink: ["Rose", "وردي", "#e8b4c0"] as [string, string, string],
  green: ["Vert", "أخضر", "#5f7d6a"] as [string, string, string],
  gray: ["Gris", "رمادي", "#8d8f94"] as [string, string, string],
  violet: ["Violet", "بنفسجي", "#8b7ab8"] as [string, string, string],
  silver: ["Argent", "فضي", "#d4d6d9"] as [string, string, string],
  midnight: ["Minuit", "ليلي", "#26293a"] as [string, string, string],
  starlight: ["Lumière stellaire", "ضوء النجوم", "#e9e3d6"] as [string, string, string],
};

const items: P[] = [
  {
    slug: "iphone-16-pro", name: "Apple iPhone 16 Pro", brand: "Apple", cat: "telephones", featured: true, isNew: true,
    fr: "Puce A18 Pro, écran Super Retina XDR 6,3\" 120 Hz, châssis en titane et système photo 48 Mpx.",
    ar: "معالج A18 Pro وشاشة Super Retina XDR مقاس 6.3 بوصة بتردد 120 هرتز وهيكل تيتانيوم ونظام تصوير 48 ميغابكسل.",
    specs: [["Écran", "الشاشة", "6,3\" OLED 120 Hz"], ["Processeur", "المعالج", "Apple A18 Pro"], ["Appareil photo", "الكاميرا", "48 Mpx + 48 Mpx + 12 Mpx"], ["Batterie", "البطارية", "Jusqu'à 27 h de vidéo"], ["5G", "5G", "Oui"]],
    variants: [
      { color: c.titanium, storage: "128 Go", price: 119900, stock: 14 },
      { color: c.titanium, storage: "256 Go", price: 129900, stock: 9 },
      { color: c.black, storage: "256 Go", price: 129900, stock: 11 },
      { color: c.white, storage: "512 Go", price: 149900, stock: 4 },
    ],
  },
  {
    slug: "iphone-16", name: "Apple iPhone 16", brand: "Apple", cat: "telephones", featured: true,
    fr: "Puce A18, bouton Action, Contrôle de l'appareil photo et écran Super Retina XDR 6,1\".",
    ar: "معالج A18 وزر الإجراءات وتحكّم بالكاميرا وشاشة Super Retina XDR مقاس 6.1 بوصة.",
    specs: [["Écran", "الشاشة", "6,1\" OLED 60 Hz"], ["Processeur", "المعالج", "Apple A18"], ["Appareil photo", "الكاميرا", "48 Mpx + 12 Mpx"], ["5G", "5G", "Oui"]],
    variants: [
      { color: c.black, storage: "128 Go", price: 85900, compare: 95900, stock: 20 },
      { color: c.pink, storage: "128 Go", price: 85900, compare: 95900, stock: 7 },
      { color: c.blue, storage: "256 Go", price: 97900, compare: 107900, stock: 10 },
    ],
  },
  {
    slug: "iphone-15", name: "Apple iPhone 15", brand: "Apple", cat: "telephones",
    fr: "Dynamic Island, appareil photo principal 48 Mpx et connecteur USB-C. Un classique au prix malin.",
    ar: "جزيرة ديناميكية وكاميرا رئيسية 48 ميغابكسل ومنفذ USB-C. خيار مميز بسعر ذكي.",
    specs: [["Écran", "الشاشة", "6,1\" OLED 60 Hz"], ["Processeur", "المعالج", "Apple A16 Bionic"], ["Connectique", "المنفذ", "USB-C"]],
    variants: [
      { color: c.black, storage: "128 Go", price: 69900, compare: 85900, stock: 16 },
      { color: c.pink, storage: "128 Go", price: 69900, compare: 85900, stock: 5 },
    ],
  },
  {
    slug: "samsung-galaxy-s25-ultra", name: "Samsung Galaxy S25 Ultra", brand: "Samsung", cat: "telephones", featured: true, isNew: true,
    fr: "Écran Dynamic AMOLED 6,9\", Snapdragon 8 Elite, S Pen intégré et capteur principal 200 Mpx.",
    ar: "شاشة Dynamic AMOLED مقاس 6.9 بوصة ومعالج Snapdragon 8 Elite وقلم S Pen مدمج ومستشعر رئيسي 200 ميغابكسل.",
    specs: [["Écran", "الشاشة", "6,9\" Dynamic AMOLED 2X 120 Hz"], ["Processeur", "المعالج", "Snapdragon 8 Elite"], ["Appareil photo", "الكاميرا", "200 Mpx + 50 Mpx + 10 Mpx + 50 Mpx"], ["Batterie", "البطارية", "5000 mAh"], ["S Pen", "قلم S Pen", "Inclus"]],
    variants: [
      { color: c.titanium, storage: "256 Go", price: 135900, stock: 8 },
      { color: c.black, storage: "512 Go", price: 151900, stock: 6 },
      { color: c.gray, storage: "1 To", price: 179900, stock: 2 },
    ],
  },
  {
    slug: "samsung-galaxy-s25", name: "Samsung Galaxy S25", brand: "Samsung", cat: "telephones", featured: true,
    fr: "Compact et puissant : Snapdragon 8 Elite, écran 6,2\" 120 Hz et fonctions Galaxy AI.",
    ar: "صغير وقوي: معالج Snapdragon 8 Elite وشاشة 6.2 بوصة بتردد 120 هرتز وميزات Galaxy AI.",
    specs: [["Écran", "الشاشة", "6,2\" Dynamic AMOLED 2X 120 Hz"], ["Processeur", "المعالج", "Snapdragon 8 Elite"], ["Batterie", "البطارية", "4000 mAh"]],
    variants: [
      { color: c.blue, storage: "128 Go", price: 84900, compare: 99900, stock: 12 },
      { color: c.black, storage: "256 Go", price: 93900, compare: 109900, stock: 9 },
    ],
  },
  {
    slug: "samsung-galaxy-a56", name: "Samsung Galaxy A56 5G", brand: "Samsung", cat: "telephones", isNew: true,
    fr: "Écran Super AMOLED 6,7\" 120 Hz, triple capteur 50 Mpx et 6 ans de mises à jour.",
    ar: "شاشة Super AMOLED مقاس 6.7 بوصة بتردد 120 هرتز وثلاث كاميرات بدقة 50 ميغابكسل وست سنوات من التحديثات.",
    specs: [["Écran", "الشاشة", "6,7\" Super AMOLED 120 Hz"], ["Batterie", "البطارية", "5000 mAh"], ["Mises à jour", "التحديثات", "6 ans"]],
    variants: [
      { color: c.gray, storage: "128 Go", price: 41900, stock: 25 },
      { color: c.green, storage: "256 Go", price: 46900, stock: 18 },
    ],
  },
  {
    slug: "google-pixel-9", name: "Google Pixel 9", brand: "Google", cat: "telephones", featured: true,
    fr: "Tensor G4, appareil photo double 50 Mpx et fonctions IA Google, avec 7 ans de mises à jour.",
    ar: "معالج Tensor G4 وكاميرا مزدوجة 50 ميغابكسل وميزات ذكاء Google الاصطناعي مع 7 سنوات من التحديثات.",
    specs: [["Écran", "الشاشة", "6,3\" OLED 120 Hz"], ["Processeur", "المعالج", "Google Tensor G4"], ["Mises à jour", "التحديثات", "7 ans"]],
    variants: [
      { color: c.black, storage: "128 Go", price: 64900, compare: 79900, stock: 13 },
      { color: c.pink, storage: "256 Go", price: 73900, compare: 89900, stock: 6 },
    ],
  },
  {
    slug: "xiaomi-14t", name: "Xiaomi 14T", brand: "Xiaomi", cat: "telephones",
    fr: "Optiques Leica, écran AMOLED 144 Hz et charge rapide 67 W pour un excellent rapport qualité/prix.",
    ar: "عدسات Leica وشاشة AMOLED بتردد 144 هرتز وشحن سريع 67 واط بأفضل قيمة مقابل السعر.",
    specs: [["Écran", "الشاشة", "6,67\" AMOLED 144 Hz"], ["Charge", "الشحن", "67 W"], ["Appareil photo", "الكاميرا", "50 Mpx Leica"]],
    variants: [
      { color: c.black, storage: "256 Go", price: 44900, compare: 59900, stock: 15 },
      { color: c.blue, storage: "256 Go", price: 44900, compare: 59900, stock: 10 },
    ],
  },
  {
    slug: "redmi-note-14-pro", name: "Xiaomi Redmi Note 14 Pro", brand: "Xiaomi", cat: "telephones",
    fr: "Écran AMOLED 6,67\" 120 Hz, capteur 200 Mpx et batterie 5110 mAh.",
    ar: "شاشة AMOLED مقاس 6.67 بوصة بتردد 120 هرتز ومستشعر 200 ميغابكسل وبطارية 5110 مللي أمبير.",
    specs: [["Écran", "الشاشة", "6,67\" AMOLED 120 Hz"], ["Appareil photo", "الكاميرا", "200 Mpx"], ["Batterie", "البطارية", "5110 mAh"]],
    variants: [
      { color: c.black, storage: "256 Go", price: 29900, stock: 30 },
      { color: c.violet, storage: "256 Go", price: 29900, stock: 22 },
    ],
  },
  {
    slug: "ipad-air-m2", name: "Apple iPad Air 11\" (M2)", brand: "Apple", cat: "tablettes", featured: true,
    fr: "Puce M2, écran Liquid Retina 11\" et compatibilité Apple Pencil Pro. Léger, rapide, polyvalent.",
    ar: "معالج M2 وشاشة Liquid Retina مقاس 11 بوصة ودعم قلم Apple Pencil Pro. خفيف وسريع ومتعدد الاستخدامات.",
    specs: [["Écran", "الشاشة", "11\" Liquid Retina"], ["Processeur", "المعالج", "Apple M2"], ["Connectivité", "الاتصال", "Wi-Fi 6E"]],
    variants: [
      { color: c.blue, storage: "128 Go", price: 66900, stock: 8 },
      { color: c.starlight, storage: "256 Go", price: 76900, stock: 5 },
    ],
  },
  {
    slug: "galaxy-tab-s10-plus", name: "Samsung Galaxy Tab S10+", brand: "Samsung", cat: "tablettes", isNew: true,
    fr: "Écran Dynamic AMOLED 12,4\", MediaTek Dimensity 9300+ et S Pen inclus pour créer et travailler.",
    ar: "شاشة Dynamic AMOLED مقاس 12.4 بوصة ومعالج Dimensity 9300+ وقلم S Pen مرفق للإبداع والعمل.",
    specs: [["Écran", "الشاشة", "12,4\" Dynamic AMOLED 2X 120 Hz"], ["S Pen", "قلم S Pen", "Inclus"], ["Batterie", "البطارية", "10090 mAh"]],
    variants: [{ color: c.gray, storage: "256 Go", price: 99900, compare: 109900, stock: 6 }],
  },
  {
    slug: "apple-watch-series-10", name: "Apple Watch Series 10", brand: "Apple", cat: "montres-connectees", featured: true,
    fr: "Écran grand angle plus lumineux, boîtier fin, suivi santé avancé et charge rapide.",
    ar: "شاشة واسعة أكثر سطوعًا وهيكل رفيع وتتبّع صحي متقدم وشحن سريع.",
    specs: [["Boîtier", "العلبة", "46 mm aluminium"], ["Étanchéité", "مقاومة الماء", "50 m"], ["Capteurs", "المستشعرات", "ECG, SpO2, température"]],
    variants: [
      { color: c.midnight, price: 44900, stock: 12 },
      { color: c.silver, price: 44900, stock: 9 },
    ],
  },
  {
    slug: "galaxy-watch-7", name: "Samsung Galaxy Watch7", brand: "Samsung", cat: "montres-connectees",
    fr: "Processeur 3 nm, analyse de composition corporelle et suivi du sommeil précis.",
    ar: "معالج 3 نانومتر وتحليل تكوين الجسم وتتبّع دقيق للنوم.",
    specs: [["Boîtier", "العلبة", "44 mm"], ["Étanchéité", "مقاومة الماء", "5 ATM"], ["Autonomie", "الاستقلالية", "Jusqu'à 40 h"]],
    variants: [
      { color: c.green, price: 27900, compare: 33900, stock: 14 },
      { color: c.silver, price: 27900, compare: 33900, stock: 8 },
    ],
  },
  {
    slug: "airpods-pro-2", name: "Apple AirPods Pro (2e génération)", brand: "Apple", cat: "audio", featured: true,
    fr: "Réduction de bruit active, audio spatial personnalisé et boîtier de charge USB-C.",
    ar: "عزل ضوضاء نشط وصوت مكاني مخصص وعلبة شحن USB-C.",
    specs: [["Réduction de bruit", "عزل الضوضاء", "Active adaptative"], ["Autonomie", "الاستقلالية", "6 h (30 h avec boîtier)"], ["Charge", "الشحن", "USB-C, MagSafe"]],
    variants: [{ color: c.white, price: 22900, compare: 27900, stock: 40 }],
  },
  {
    slug: "galaxy-buds3-pro", name: "Samsung Galaxy Buds3 Pro", brand: "Samsung", cat: "audio", isNew: true,
    fr: "Son Hi-Fi 24 bits, réduction de bruit intelligente et design à tige repensé.",
    ar: "صوت عالي الدقة 24 بت وعزل ضوضاء ذكي وتصميم بسيقان جديد.",
    specs: [["Réduction de bruit", "عزل الضوضاء", "ANC intelligente"], ["Autonomie", "الاستقلالية", "6 h (26 h avec boîtier)"], ["Étanchéité", "مقاومة الماء", "IP57"]],
    variants: [{ color: c.silver, price: 18900, compare: 24900, stock: 20 }, { color: c.white, price: 18900, compare: 24900, stock: 16 }],
  },
  {
    slug: "sony-wh-1000xm5", name: "Sony WH-1000XM5", brand: "Sony", cat: "audio", featured: true,
    fr: "Casque sans fil de référence : réduction de bruit exceptionnelle et 30 h d'autonomie.",
    ar: "سماعة لاسلكية مرجعية: عزل ضوضاء استثنائي واستقلالية 30 ساعة.",
    specs: [["Réduction de bruit", "عزل الضوضاء", "Active, 8 micros"], ["Autonomie", "الاستقلالية", "30 h"], ["Connexion", "الاتصال", "Bluetooth 5.2, multipoint"]],
    variants: [{ color: c.black, price: 29900, compare: 39900, stock: 11 }, { color: c.silver, price: 29900, compare: 39900, stock: 7 }],
  },
  {
    slug: "jbl-flip-6", name: "JBL Flip 6", brand: "JBL", cat: "audio",
    fr: "Enceinte Bluetooth portable étanche IP67 avec basses puissantes et 12 h d'autonomie.",
    ar: "مكبّر صوت بلوتوث محمول مقاوم للماء IP67 بباس قوي واستقلالية 12 ساعة.",
    specs: [["Étanchéité", "مقاومة الماء", "IP67"], ["Autonomie", "الاستقلالية", "12 h"], ["Puissance", "القدرة", "30 W"]],
    variants: [{ color: c.blue, price: 9900, compare: 14900, stock: 35 }, { color: c.black, price: 9900, compare: 14900, stock: 28 }],
  },
  {
    slug: "macbook-air-m3-13", name: "Apple MacBook Air 13\" (M3)", brand: "Apple", cat: "laptops", featured: true,
    fr: "Ultra-fin, silencieux, puce M3 et jusqu'à 18 h d'autonomie. Écran Liquid Retina 13,6\".",
    ar: "نحيف جدًا وصامت بمعالج M3 واستقلالية تصل إلى 18 ساعة وشاشة Liquid Retina مقاس 13.6 بوصة.",
    specs: [["Écran", "الشاشة", "13,6\" Liquid Retina"], ["Processeur", "المعالج", "Apple M3"], ["Mémoire", "الذاكرة", "8 Go unifiée"], ["Autonomie", "الاستقلالية", "Jusqu'à 18 h"]],
    variants: [
      { color: c.midnight, storage: "256 Go", price: 109900, stock: 6 },
      { color: c.starlight, storage: "512 Go", price: 129900, stock: 4 },
    ],
  },
  {
    slug: "chargeur-gan-65w", name: "Chargeur rapide GaN 65 W USB-C", brand: "Anker", cat: "accessoires",
    fr: "Chargeur compact 3 ports (2 USB-C + 1 USB-A) pour charger smartphone, tablette et portable.",
    ar: "شاحن صغير بثلاثة منافذ (2 USB-C و1 USB-A) لشحن الهاتف واللوحي والحاسوب المحمول.",
    specs: [["Puissance", "القدرة", "65 W"], ["Ports", "المنافذ", "2 × USB-C, 1 × USB-A"], ["Technologie", "التقنية", "GaN"]],
    variants: [{ color: c.white, price: 3990, compare: 5490, stock: 60 }, { color: c.black, price: 3990, compare: 5490, stock: 45 }],
  },
  {
    slug: "cable-usb-c-2m", name: "Câble USB-C tressé 2 m", brand: "Anker", cat: "accessoires",
    fr: "Câble en nylon tressé résistant, charge 100 W et transfert de données rapide.",
    ar: "كابل نايلون مجدول متين يدعم شحن 100 واط ونقل بيانات سريعًا.",
    specs: [["Longueur", "الطول", "2 m"], ["Puissance", "القدرة", "100 W"], ["Connecteurs", "الموصلات", "USB-C vers USB-C"]],
    variants: [{ color: c.black, price: 1490, stock: 120 }, { color: c.gray, price: 1490, stock: 80 }],
  },
  {
    slug: "coque-magsafe-iphone-16", name: "Coque MagSafe pour iPhone 16", brand: "Spigen", cat: "accessoires",
    fr: "Coque antichoc compatible MagSafe avec bords surélevés pour protéger écran et caméra.",
    ar: "غطاء مقاوم للصدمات متوافق مع MagSafe بحواف مرتفعة لحماية الشاشة والكاميرا.",
    specs: [["Compatibilité", "التوافق", "iPhone 16"], ["MagSafe", "MagSafe", "Oui"], ["Protection", "الحماية", "Antichoc MIL-STD"]],
    variants: [{ color: c.black, price: 2990, stock: 50 }, { color: c.blue, price: 2990, stock: 30 }, { color: c.pink, price: 2990, stock: 3 }],
  },
  {
    slug: "batterie-externe-20000", name: "Batterie externe 20 000 mAh 65 W", brand: "Anker", cat: "accessoires", isNew: true,
    fr: "Power bank haute capacité avec charge rapide 65 W : recharge un smartphone 4 fois ou un portable.",
    ar: "بطارية خارجية عالية السعة بشحن سريع 65 واط: تشحن الهاتف 4 مرات أو حاسوبًا محمولًا.",
    specs: [["Capacité", "السعة", "20 000 mAh"], ["Puissance", "القدرة", "65 W"], ["Ports", "المنافذ", "2 × USB-C, 1 × USB-A"]],
    variants: [{ color: c.black, price: 7990, compare: 9990, stock: 22 }],
  },
  // ---- Mobilité électrique ----
  {
    slug: "xiaomi-electric-scooter-4-pro", name: "Xiaomi Electric Scooter 4 Pro", brand: "Xiaomi", cat: "mobilite-electrique", featured: true, isNew: true,
    fr: "Trottinette électrique pliable : jusqu'à 55 km d'autonomie, 25 km/h et freinage double pour la ville.",
    ar: "سكوتر كهربائي قابل للطي: مدى يصل إلى 55 كم وسرعة 25 كم/س وفرامل مزدوجة للتنقل داخل المدينة.",
    specs: [["Autonomie", "المدى", "Jusqu'à 55 km"], ["Vitesse max", "السرعة القصوى", "25 km/h"], ["Moteur", "المحرك", "350 W (pic 700 W)"], ["Pneus", "الإطارات", "10\" tubeless"]],
    variants: [{ color: c.black, price: 64900, compare: 74900, stock: 12 }],
  },
  {
    slug: "xiaomi-electric-scooter-4-lite", name: "Xiaomi Electric Scooter 4 Lite", brand: "Xiaomi", cat: "mobilite-electrique",
    fr: "Légère et compacte, idéale pour les trajets quotidiens : 20 km d'autonomie et pliage rapide.",
    ar: "خفيفة وصغيرة الحجم للتنقل اليومي: مدى 20 كم وطي سريع.",
    specs: [["Autonomie", "المدى", "Jusqu'à 20 km"], ["Vitesse max", "السرعة القصوى", "25 km/h"], ["Poids", "الوزن", "Environ 13 kg"]],
    variants: [{ color: c.black, price: 39900, compare: 44900, stock: 18 }, { color: c.white, price: 39900, compare: 44900, stock: 9 }],
  },
  {
    slug: "ninebot-kickscooter-f2-pro", name: "Segway Ninebot KickScooter F2 Pro", brand: "Segway", cat: "mobilite-electrique",
    fr: "Trottinette électrique robuste avec suspension avant et clignotants intégrés pour rouler en sécurité.",
    ar: "سكوتر كهربائي متين بنظام تعليق أمامي وإشارات انعطاف مدمجة لقيادة آمنة.",
    specs: [["Autonomie", "المدى", "Jusqu'à 55 km"], ["Vitesse max", "السرعة القصوى", "25 km/h"], ["Clignotants", "إشارات الانعطاف", "Intégrés"]],
    variants: [{ color: c.gray, price: 59900, compare: 69900, stock: 7 }],
  },
  // ---- Téléviseurs ----
  {
    slug: "samsung-crystal-uhd-55", name: "Samsung Crystal UHD 4K 55\"", brand: "Samsung", cat: "televiseurs", featured: true,
    fr: "Téléviseur 4K de 55 pouces avec processeur Crystal 4K et Smart TV pour tous vos services de streaming.",
    ar: "تلفاز 4K مقاس 55 بوصة بمعالج Crystal 4K ونظام ذكي لجميع خدمات البث.",
    specs: [["Diagonale", "الحجم", "55\" (138 cm)"], ["Résolution", "الدقة", "4K UHD 3840 × 2160"], ["Smart TV", "التلفاز الذكي", "Tizen"], ["HDMI", "HDMI", "3 ports"]],
    variants: [{ color: c.black, price: 44900, compare: 54900, stock: 10 }],
  },
  {
    slug: "lg-oled-evo-c4-55", name: "LG OLED evo C4 55\"", brand: "LG", cat: "televiseurs", featured: true, isNew: true,
    fr: "Dalle OLED evo 4K 120 Hz, noirs parfaits et HDMI 2.1 : le choix des cinéphiles et des joueurs.",
    ar: "شاشة OLED evo بدقة 4K وتردد 120 هرتز وأسود مثالي ومنافذ HDMI 2.1: خيار عشاق السينما والألعاب.",
    specs: [["Diagonale", "الحجم", "55\" (139 cm)"], ["Dalle", "الشاشة", "OLED evo 4K 120 Hz"], ["Système", "النظام", "webOS"], ["HDMI 2.1", "HDMI 2.1", "4 ports"]],
    variants: [{ color: c.black, price: 129900, compare: 149900, stock: 5 }],
  },
  {
    slug: "sony-bravia-x85l-55", name: "Sony BRAVIA X85L 55\"", brand: "Sony", cat: "televiseurs",
    fr: "LED 4K HDR avec Google TV, 120 Hz et technologie Triluminos Pro pour des couleurs éclatantes.",
    ar: "شاشة LED بدقة 4K وHDR مع Google TV وتردد 120 هرتز وتقنية Triluminos Pro لألوان نابضة.",
    specs: [["Diagonale", "الحجم", "55\" (139 cm)"], ["Résolution", "الدقة", "4K HDR"], ["Système", "النظام", "Google TV"]],
    variants: [{ color: c.black, price: 89900, compare: 99900, stock: 6 }],
  },
  // ---- Électroménagers ----
  {
    slug: "dyson-v15-detect", name: "Dyson V15 Detect", brand: "Dyson", cat: "electromenagers", featured: true,
    fr: "Aspirateur balai sans fil avec laser qui révèle la poussière invisible et jusqu'à 60 minutes d'autonomie.",
    ar: "مكنسة لاسلكية بليزر يكشف الغبار غير المرئي ومدة تشغيل تصل إلى 60 دقيقة.",
    specs: [["Autonomie", "مدة التشغيل", "Jusqu'à 60 min"], ["Détection", "الكشف", "Laser + capteur piézo"], ["Type", "النوع", "Aspirateur balai sans fil"]],
    variants: [{ color: c.gray, price: 64900, compare: 74900, stock: 8 }],
  },
  {
    slug: "philips-airfryer-3000", name: "Philips Airfryer Série 3000", brand: "Philips", cat: "electromenagers",
    fr: "Friteuse sans huile 4,1 L pour des plats croustillants avec jusqu'à 90 % de matières grasses en moins.",
    ar: "قلاية هوائية بسعة 4.1 لتر لوجبات مقرمشة بدهون أقل بنسبة تصل إلى 90٪.",
    specs: [["Capacité", "السعة", "4,1 L"], ["Technologie", "التقنية", "Rapid Air"], ["Type", "النوع", "Friteuse sans huile"]],
    variants: [{ color: c.black, price: 10900, compare: 14900, stock: 25 }],
  },
  {
    slug: "xiaomi-robot-vacuum-s10", name: "Xiaomi Robot Vacuum S10", brand: "Xiaomi", cat: "electromenagers", isNew: true,
    fr: "Robot aspirateur et laveur à navigation laser, 4000 Pa d'aspiration et pilotage depuis l'application.",
    ar: "روبوت مكنسة وممسحة بملاحة ليزرية وقوة شفط 4000 باسكال وتحكم عبر التطبيق.",
    specs: [["Aspiration", "قوة الشفط", "4000 Pa"], ["Navigation", "الملاحة", "Laser LDS"], ["Pilotage", "التحكم", "Application mobile"]],
    variants: [{ color: c.white, price: 24900, compare: 32900, stock: 14 }],
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema: s });

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.products);
  if (n > 0 && !process.argv.includes("--force")) {
    console.log(`Database already has ${n} products. Use --force to reseed (this wipes the catalog and orders).`);
    await client.end();
    return;
  }

  await db.execute(sql`truncate table order_items, orders, variants, products, categories, coupons restart identity cascade`);
  const cats = await db
    .insert(s.categories)
    .values(categories)
    .returning();
  const catId = new Map(cats.map((x) => [x.slug, x.id]));

  let sku = 1000;
  for (const [i, p] of items.entries()) {
    const [row] = await db
      .insert(s.products)
      .values({
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        categoryId: catId.get(p.cat)!,
        shortFr: p.fr,
        shortAr: p.ar,
        descFr: p.fr,
        descAr: p.ar,
        specs: p.specs.map(([fr, ar, value]) => ({ fr, ar, value })),
        featured: !!p.featured,
        isNew: !!p.isNew,
        createdAt: new Date(Date.now() - i * 36e5 * 6),
      })
      .returning();
    await db.insert(s.variants).values(
      p.variants.map((v, j) => ({
        productId: row.id,
        sku: `ES-${sku++}`,
        colorFr: v.color[0],
        colorAr: v.color[1],
        colorHex: v.color[2],
        storage: v.storage ?? "",
        price: v.price,
        compareAtPrice: v.compare ?? null,
        stock: v.stock,
        sort: j,
      })),
    );
  }

  await db.insert(s.coupons).values([
    { code: "BIENVENUE10", percent: 10, minSubtotal: 5000 },
    { code: "ETE20", amountOff: 2000, minSubtotal: 15000 },
  ]);

  console.log(`Seeded ${cats.length} categories, ${items.length} products, 2 coupons`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
