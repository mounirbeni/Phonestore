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
  condition?: "new" | "used";
  warranty?: number;
  variants: V[];
};

type Cat = { slug: string; nameFr: string; nameAr: string; icon: string; sort: number; parent?: string };

// Two levels: a top-level family and its leaf sub-categories. Products live in leaves only, so a
// family page lists exactly what belongs to it. The first nine rows keep their ids (and so the
// existing products); `sort` follows the storefront menu order, array order only fixes the ids.
const categories: Cat[] = [
  { slug: "telephones", nameFr: "Téléphones", nameAr: "الهواتف", icon: "phone", sort: 1 },
  { slug: "tablettes", nameFr: "Tablettes", nameAr: "الأجهزة اللوحية", icon: "tablet", sort: 4 },
  { slug: "montres-bracelets", nameFr: "Montres & bracelets", nameAr: "الساعات والأساور", icon: "watch", sort: 7 },
  { slug: "audio", nameFr: "Audio", nameAr: "الصوتيات", icon: "audio", sort: 8 },
  { slug: "informatique", nameFr: "Informatique", nameAr: "الحواسيب والملحقات", icon: "laptop", sort: 3 },
  { slug: "accessoires-mobiles", nameFr: "Accessoires mobiles", nameAr: "إكسسوارات الهواتف", icon: "accessory", sort: 2 },
  { slug: "mobilite-electrique", nameFr: "Mobilité électrique", nameAr: "التنقل الكهربائي", icon: "scooter", sort: 0 },
  { slug: "televiseurs", nameFr: "Téléviseurs", nameAr: "أجهزة التلفاز", icon: "tv", sort: 5 },
  { slug: "electromenagers", nameFr: "Électroménager", nameAr: "الأجهزة المنزلية", icon: "home", sort: 6 },
  { slug: "gaming", nameFr: "Gaming", nameAr: "الألعاب", icon: "console", sort: 9 },
  { slug: "photo-video", nameFr: "Photo & vidéo", nameAr: "التصوير والفيديو", icon: "camera", sort: 10 },
  { slug: "maison-connectee", nameFr: "Maison connectée", nameAr: "المنزل الذكي", icon: "bulb", sort: 11 },
  // Montres & bracelets
  { slug: "montres-connectees", nameFr: "Montres connectées", nameAr: "الساعات الذكية", icon: "watch", sort: 1, parent: "montres-bracelets" },
  { slug: "bracelets-connectes", nameFr: "Bracelets connectés", nameAr: "الأساور الذكية", icon: "band", sort: 2, parent: "montres-bracelets" },
  { slug: "bracelets-de-montre", nameFr: "Bracelets de montre", nameAr: "أحزمة الساعات", icon: "band", sort: 3, parent: "montres-bracelets" },
  // Audio
  { slug: "ecouteurs", nameFr: "Écouteurs", nameAr: "سماعات الأذن", icon: "earbuds", sort: 1, parent: "audio" },
  { slug: "casques-audio", nameFr: "Casques audio", nameAr: "سماعات الرأس", icon: "headphones", sort: 2, parent: "audio" },
  { slug: "enceintes-bluetooth", nameFr: "Enceintes Bluetooth", nameAr: "مكبّرات البلوتوث", icon: "speaker", sort: 3, parent: "audio" },
  { slug: "barres-de-son", nameFr: "Barres de son", nameAr: "مكبّرات الصوت للتلفاز", icon: "soundbar", sort: 4, parent: "audio" },
  // Informatique
  { slug: "ordinateurs-portables", nameFr: "Ordinateurs portables", nameAr: "الحواسيب المحمولة", icon: "laptop", sort: 1, parent: "informatique" },
  { slug: "ecrans-moniteurs", nameFr: "Écrans & moniteurs", nameAr: "الشاشات", icon: "monitor", sort: 2, parent: "informatique" },
  { slug: "claviers-souris", nameFr: "Claviers & souris", nameAr: "لوحات المفاتيح والفأرات", icon: "keyboard", sort: 3, parent: "informatique" },
  { slug: "stockage", nameFr: "Stockage & SSD", nameAr: "التخزين", icon: "ssd", sort: 4, parent: "informatique" },
  { slug: "imprimantes", nameFr: "Imprimantes", nameAr: "الطابعات", icon: "printer", sort: 5, parent: "informatique" },
  // Accessoires mobiles
  { slug: "chargeurs", nameFr: "Chargeurs", nameAr: "الشواحن", icon: "charger", sort: 1, parent: "accessoires-mobiles" },
  { slug: "cables", nameFr: "Câbles", nameAr: "الكابلات", icon: "cable", sort: 2, parent: "accessoires-mobiles" },
  { slug: "batteries-externes", nameFr: "Batteries externes", nameAr: "البطاريات الخارجية", icon: "powerbank", sort: 3, parent: "accessoires-mobiles" },
  { slug: "coques-protections", nameFr: "Coques & protections", nameAr: "الأغطية والحماية", icon: "case", sort: 4, parent: "accessoires-mobiles" },
  { slug: "supports", nameFr: "Supports & fixations", nameAr: "الحوامل", icon: "holder", sort: 5, parent: "accessoires-mobiles" },
  // Mobilité électrique
  { slug: "trottinettes-electriques", nameFr: "Trottinettes électriques", nameAr: "السكوترات الكهربائية", icon: "scooter", sort: 1, parent: "mobilite-electrique" },
  { slug: "velos-electriques", nameFr: "Vélos électriques", nameAr: "الدراجات الكهربائية", icon: "ebike", sort: 2, parent: "mobilite-electrique" },
  // Électroménager
  { slug: "aspirateurs-robots", nameFr: "Aspirateurs & robots", nameAr: "المكانس والروبوتات", icon: "vacuum", sort: 1, parent: "electromenagers" },
  { slug: "cuisine", nameFr: "Cuisine & cuisson", nameAr: "المطبخ والطهي", icon: "airfryer", sort: 2, parent: "electromenagers" },
  { slug: "cafe", nameFr: "Machines à café", nameAr: "آلات القهوة", icon: "coffee", sort: 3, parent: "electromenagers" },
  { slug: "refrigerateurs", nameFr: "Réfrigérateurs", nameAr: "الثلاجات", icon: "fridge", sort: 4, parent: "electromenagers" },
  // Gaming
  { slug: "consoles", nameFr: "Consoles de jeu", nameAr: "أجهزة الألعاب", icon: "console", sort: 1, parent: "gaming" },
  { slug: "manettes", nameFr: "Manettes", nameAr: "أذرع التحكم", icon: "gamepad", sort: 2, parent: "gaming" },
  // Photo & vidéo
  { slug: "appareils-photo", nameFr: "Appareils photo", nameAr: "كاميرات التصوير", icon: "camera", sort: 1, parent: "photo-video" },
  { slug: "cameras-sport", nameFr: "Caméras sportives", nameAr: "كاميرات الحركة", icon: "camera", sort: 2, parent: "photo-video" },
  { slug: "drones", nameFr: "Drones", nameAr: "الطائرات المسيّرة", icon: "drone", sort: 3, parent: "photo-video" },
  // Maison connectée
  { slug: "cameras-surveillance", nameFr: "Caméras de surveillance", nameAr: "كاميرات المراقبة", icon: "ipcam", sort: 1, parent: "maison-connectee" },
  { slug: "eclairage-connecte", nameFr: "Éclairage connecté", nameAr: "الإضاءة الذكية", icon: "bulb", sort: 2, parent: "maison-connectee" },
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
    slug: "airpods-pro-2", name: "Apple AirPods Pro (2e génération)", brand: "Apple", cat: "ecouteurs", featured: true,
    fr: "Réduction de bruit active, audio spatial personnalisé et boîtier de charge USB-C.",
    ar: "عزل ضوضاء نشط وصوت مكاني مخصص وعلبة شحن USB-C.",
    specs: [["Réduction de bruit", "عزل الضوضاء", "Active adaptative"], ["Autonomie", "الاستقلالية", "6 h (30 h avec boîtier)"], ["Charge", "الشحن", "USB-C, MagSafe"]],
    variants: [{ color: c.white, price: 22900, compare: 27900, stock: 40 }],
  },
  {
    slug: "galaxy-buds3-pro", name: "Samsung Galaxy Buds3 Pro", brand: "Samsung", cat: "ecouteurs", isNew: true,
    fr: "Son Hi-Fi 24 bits, réduction de bruit intelligente et design à tige repensé.",
    ar: "صوت عالي الدقة 24 بت وعزل ضوضاء ذكي وتصميم بسيقان جديد.",
    specs: [["Réduction de bruit", "عزل الضوضاء", "ANC intelligente"], ["Autonomie", "الاستقلالية", "6 h (26 h avec boîtier)"], ["Étanchéité", "مقاومة الماء", "IP57"]],
    variants: [{ color: c.silver, price: 18900, compare: 24900, stock: 20 }, { color: c.white, price: 18900, compare: 24900, stock: 16 }],
  },
  {
    slug: "sony-wh-1000xm5", name: "Sony WH-1000XM5", brand: "Sony", cat: "casques-audio", featured: true,
    fr: "Casque sans fil de référence : réduction de bruit exceptionnelle et 30 h d'autonomie.",
    ar: "سماعة لاسلكية مرجعية: عزل ضوضاء استثنائي واستقلالية 30 ساعة.",
    specs: [["Réduction de bruit", "عزل الضوضاء", "Active, 8 micros"], ["Autonomie", "الاستقلالية", "30 h"], ["Connexion", "الاتصال", "Bluetooth 5.2, multipoint"]],
    variants: [{ color: c.black, price: 29900, compare: 39900, stock: 11 }, { color: c.silver, price: 29900, compare: 39900, stock: 7 }],
  },
  {
    slug: "jbl-flip-6", name: "JBL Flip 6", brand: "JBL", cat: "enceintes-bluetooth",
    fr: "Enceinte Bluetooth portable étanche IP67 avec basses puissantes et 12 h d'autonomie.",
    ar: "مكبّر صوت بلوتوث محمول مقاوم للماء IP67 بباس قوي واستقلالية 12 ساعة.",
    specs: [["Étanchéité", "مقاومة الماء", "IP67"], ["Autonomie", "الاستقلالية", "12 h"], ["Puissance", "القدرة", "30 W"]],
    variants: [{ color: c.blue, price: 9900, compare: 14900, stock: 35 }, { color: c.black, price: 9900, compare: 14900, stock: 28 }],
  },
  {
    slug: "macbook-air-m3-13", name: "Apple MacBook Air 13\" (M3)", brand: "Apple", cat: "ordinateurs-portables", featured: true,
    fr: "Ultra-fin, silencieux, puce M3 et jusqu'à 18 h d'autonomie. Écran Liquid Retina 13,6\".",
    ar: "نحيف جدًا وصامت بمعالج M3 واستقلالية تصل إلى 18 ساعة وشاشة Liquid Retina مقاس 13.6 بوصة.",
    specs: [["Écran", "الشاشة", "13,6\" Liquid Retina"], ["Processeur", "المعالج", "Apple M3"], ["Mémoire", "الذاكرة", "8 Go unifiée"], ["Autonomie", "الاستقلالية", "Jusqu'à 18 h"]],
    variants: [
      { color: c.midnight, storage: "256 Go", price: 109900, stock: 6 },
      { color: c.starlight, storage: "512 Go", price: 129900, stock: 4 },
    ],
  },
  {
    slug: "chargeur-gan-65w", name: "Chargeur rapide GaN 65 W USB-C", brand: "Anker", cat: "chargeurs",
    fr: "Chargeur compact 3 ports (2 USB-C + 1 USB-A) pour charger smartphone, tablette et portable.",
    ar: "شاحن صغير بثلاثة منافذ (2 USB-C و1 USB-A) لشحن الهاتف واللوحي والحاسوب المحمول.",
    specs: [["Puissance", "القدرة", "65 W"], ["Ports", "المنافذ", "2 × USB-C, 1 × USB-A"], ["Technologie", "التقنية", "GaN"]],
    variants: [{ color: c.white, price: 3990, compare: 5490, stock: 60 }, { color: c.black, price: 3990, compare: 5490, stock: 45 }],
  },
  {
    slug: "cable-usb-c-2m", name: "Câble USB-C tressé 2 m", brand: "Anker", cat: "cables",
    fr: "Câble en nylon tressé résistant, charge 100 W et transfert de données rapide.",
    ar: "كابل نايلون مجدول متين يدعم شحن 100 واط ونقل بيانات سريعًا.",
    specs: [["Longueur", "الطول", "2 m"], ["Puissance", "القدرة", "100 W"], ["Connecteurs", "الموصلات", "USB-C vers USB-C"]],
    variants: [{ color: c.black, price: 1490, stock: 120 }, { color: c.gray, price: 1490, stock: 80 }],
  },
  {
    slug: "coque-magsafe-iphone-16", name: "Coque MagSafe pour iPhone 16", brand: "Spigen", cat: "coques-protections",
    fr: "Coque antichoc compatible MagSafe avec bords surélevés pour protéger écran et caméra.",
    ar: "غطاء مقاوم للصدمات متوافق مع MagSafe بحواف مرتفعة لحماية الشاشة والكاميرا.",
    specs: [["Compatibilité", "التوافق", "iPhone 16"], ["MagSafe", "MagSafe", "Oui"], ["Protection", "الحماية", "Antichoc MIL-STD"]],
    variants: [{ color: c.black, price: 2990, stock: 50 }, { color: c.blue, price: 2990, stock: 30 }, { color: c.pink, price: 2990, stock: 3 }],
  },
  {
    slug: "batterie-externe-20000", name: "Batterie externe 20 000 mAh 65 W", brand: "Anker", cat: "batteries-externes", isNew: true,
    fr: "Power bank haute capacité avec charge rapide 65 W : recharge un smartphone 4 fois ou un portable.",
    ar: "بطارية خارجية عالية السعة بشحن سريع 65 واط: تشحن الهاتف 4 مرات أو حاسوبًا محمولًا.",
    specs: [["Capacité", "السعة", "20 000 mAh"], ["Puissance", "القدرة", "65 W"], ["Ports", "المنافذ", "2 × USB-C, 1 × USB-A"]],
    variants: [{ color: c.black, price: 7990, compare: 9990, stock: 22 }],
  },
  // ---- Mobilité électrique ----
  {
    slug: "xiaomi-electric-scooter-4-pro", name: "Xiaomi Electric Scooter 4 Pro", brand: "Xiaomi", cat: "trottinettes-electriques", featured: true, isNew: true,
    fr: "Trottinette électrique pliable : jusqu'à 55 km d'autonomie, 25 km/h et freinage double pour la ville.",
    ar: "سكوتر كهربائي قابل للطي: مدى يصل إلى 55 كم وسرعة 25 كم/س وفرامل مزدوجة للتنقل داخل المدينة.",
    specs: [["Autonomie", "المدى", "Jusqu'à 55 km"], ["Vitesse max", "السرعة القصوى", "25 km/h"], ["Moteur", "المحرك", "350 W (pic 700 W)"], ["Pneus", "الإطارات", "10\" tubeless"]],
    variants: [{ color: c.black, price: 64900, compare: 74900, stock: 12 }],
  },
  {
    slug: "xiaomi-electric-scooter-4-lite", name: "Xiaomi Electric Scooter 4 Lite", brand: "Xiaomi", cat: "trottinettes-electriques",
    fr: "Légère et compacte, idéale pour les trajets quotidiens : 20 km d'autonomie et pliage rapide.",
    ar: "خفيفة وصغيرة الحجم للتنقل اليومي: مدى 20 كم وطي سريع.",
    specs: [["Autonomie", "المدى", "Jusqu'à 20 km"], ["Vitesse max", "السرعة القصوى", "25 km/h"], ["Poids", "الوزن", "Environ 13 kg"]],
    variants: [{ color: c.black, price: 39900, compare: 44900, stock: 18 }, { color: c.white, price: 39900, compare: 44900, stock: 9 }],
  },
  {
    slug: "ninebot-kickscooter-f2-pro", name: "Segway Ninebot KickScooter F2 Pro", brand: "Segway", cat: "trottinettes-electriques",
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
    slug: "dyson-v15-detect", name: "Dyson V15 Detect", brand: "Dyson", cat: "aspirateurs-robots", featured: true,
    fr: "Aspirateur balai sans fil avec laser qui révèle la poussière invisible et jusqu'à 60 minutes d'autonomie.",
    ar: "مكنسة لاسلكية بليزر يكشف الغبار غير المرئي ومدة تشغيل تصل إلى 60 دقيقة.",
    specs: [["Autonomie", "مدة التشغيل", "Jusqu'à 60 min"], ["Détection", "الكشف", "Laser + capteur piézo"], ["Type", "النوع", "Aspirateur balai sans fil"]],
    variants: [{ color: c.gray, price: 64900, compare: 74900, stock: 8 }],
  },
  {
    slug: "philips-airfryer-3000", name: "Philips Airfryer Série 3000", brand: "Philips", cat: "cuisine",
    fr: "Friteuse sans huile 4,1 L pour des plats croustillants avec jusqu'à 90 % de matières grasses en moins.",
    ar: "قلاية هوائية بسعة 4.1 لتر لوجبات مقرمشة بدهون أقل بنسبة تصل إلى 90٪.",
    specs: [["Capacité", "السعة", "4,1 L"], ["Technologie", "التقنية", "Rapid Air"], ["Type", "النوع", "Friteuse sans huile"]],
    variants: [{ color: c.black, price: 10900, compare: 14900, stock: 25 }],
  },
  {
    slug: "xiaomi-robot-vacuum-s10", name: "Xiaomi Robot Vacuum S10", brand: "Xiaomi", cat: "aspirateurs-robots", isNew: true,
    fr: "Robot aspirateur et laveur à navigation laser, 4000 Pa d'aspiration et pilotage depuis l'application.",
    ar: "روبوت مكنسة وممسحة بملاحة ليزرية وقوة شفط 4000 باسكال وتحكم عبر التطبيق.",
    specs: [["Aspiration", "قوة الشفط", "4000 Pa"], ["Navigation", "الملاحة", "Laser LDS"], ["Pilotage", "التحكم", "Application mobile"]],
    variants: [{ color: c.white, price: 24900, compare: 32900, stock: 14 }],
  },
  // ---- Téléphones d'occasion ----
  {
    slug: "iphone-13-occasion", name: "Apple iPhone 13 (Occasion)", brand: "Apple", cat: "telephones", condition: "used", warranty: 12,
    fr: "iPhone 13 d'occasion testé et vérifié : très bon état, batterie contrôlée et garantie 12 mois.",
    ar: "آيفون 13 مستعمل مفحوص ومراجع: حالة جيدة جدًا وبطارية مفحوصة وضمان 12 شهرًا.",
    specs: [["État", "الحالة", "Très bon état"], ["Écran", "الشاشة", "6,1\" OLED"], ["Puce", "المعالج", "Apple A15 Bionic"], ["Batterie", "البطارية", "Santé supérieure à 85 %"]],
    variants: [{ color: c.black, storage: "128 Go", price: 39900, stock: 6 }, { color: c.blue, storage: "128 Go", price: 41900, stock: 3 }],
  },
  {
    slug: "iphone-12-occasion", name: "Apple iPhone 12 (Occasion)", brand: "Apple", cat: "telephones", condition: "used", warranty: 12,
    fr: "iPhone 12 d'occasion, écran OLED et 5G : un excellent rapport qualité/prix, testé et garanti.",
    ar: "آيفون 12 مستعمل بشاشة OLED و5G: قيمة ممتازة مقابل السعر، مفحوص ومضمون.",
    specs: [["État", "الحالة", "Bon état"], ["Écran", "الشاشة", "6,1\" OLED"], ["Puce", "المعالج", "Apple A14 Bionic"], ["5G", "5G", "Oui"]],
    variants: [{ color: c.black, storage: "64 Go", price: 27900, stock: 8 }, { color: c.white, storage: "128 Go", price: 31900, stock: 4 }],
  },
  {
    slug: "samsung-galaxy-s22-occasion", name: "Samsung Galaxy S22 (Occasion)", brand: "Samsung", cat: "telephones", condition: "used", warranty: 12,
    fr: "Galaxy S22 d'occasion : écran Dynamic AMOLED 120 Hz, très bon état, testé et garanti 12 mois.",
    ar: "جالكسي S22 مستعمل: شاشة Dynamic AMOLED بتردد 120 هرتز وحالة جيدة جدًا، مفحوص وبضمان 12 شهرًا.",
    specs: [["État", "الحالة", "Très bon état"], ["Écran", "الشاشة", "6,1\" Dynamic AMOLED 2X 120 Hz"], ["Processeur", "المعالج", "Snapdragon 8 Gen 1"]],
    variants: [{ color: c.black, storage: "128 Go", price: 34900, stock: 5 }, { color: c.green, storage: "256 Go", price: 38900, stock: 2 }],
  },
  {
    slug: "samsung-galaxy-s21-fe-occasion", name: "Samsung Galaxy S21 FE (Occasion)", brand: "Samsung", cat: "telephones", condition: "used", warranty: 12,
    fr: "Galaxy S21 FE d'occasion avec grand écran 120 Hz et triple capteur photo, vérifié avant expédition.",
    ar: "جالكسي S21 FE مستعمل بشاشة كبيرة 120 هرتز وثلاث كاميرات، مفحوص قبل الشحن.",
    specs: [["État", "الحالة", "Bon état"], ["Écran", "الشاشة", "6,4\" AMOLED 120 Hz"], ["Batterie", "البطارية", "4500 mAh"]],
    variants: [{ color: c.gray, storage: "128 Go", price: 22900, stock: 7 }],
  },
  {
    slug: "google-pixel-7-occasion", name: "Google Pixel 7 (Occasion)", brand: "Google", cat: "telephones", condition: "used", warranty: 12,
    fr: "Pixel 7 d'occasion : Tensor G2, excellent appareil photo et mises à jour Google, testé et garanti.",
    ar: "بكسل 7 مستعمل: معالج Tensor G2 وكاميرا ممتازة وتحديثات Google، مفحوص ومضمون.",
    specs: [["État", "الحالة", "Très bon état"], ["Processeur", "المعالج", "Google Tensor G2"], ["Écran", "الشاشة", "6,3\" OLED 90 Hz"]],
    variants: [{ color: c.black, storage: "128 Go", price: 27900, stock: 4 }],
  },
  {
    slug: "redmi-note-11-occasion", name: "Xiaomi Redmi Note 11 (Occasion)", brand: "Xiaomi", cat: "telephones", condition: "used", warranty: 12,
    fr: "Redmi Note 11 d'occasion, écran AMOLED et charge rapide : l'essentiel à petit prix, testé et garanti.",
    ar: "ريدمي نوت 11 مستعمل بشاشة AMOLED وشحن سريع: الأساسيات بسعر صغير، مفحوص ومضمون.",
    specs: [["État", "الحالة", "Bon état"], ["Écran", "الشاشة", "6,43\" AMOLED 90 Hz"], ["Charge", "الشحن", "33 W"]],
    variants: [{ color: c.gray, storage: "128 Go", price: 10900, stock: 10 }],
  },

  // ---- Catalogue élargi : un produit par sous-catégorie précise ----
  {
    slug: "huawei-watch-gt-5", name: "Huawei Watch GT 5", brand: "Huawei", cat: "montres-connectees", isNew: true,
    fr: "Montre connectée élégante avec écran AMOLED 1,43\", suivi sportif précis et jusqu'à 14 jours d'autonomie.",
    ar: "ساعة ذكية أنيقة بشاشة AMOLED مقاس 1.43 بوصة وتتبّع رياضي دقيق واستقلالية تصل إلى 14 يومًا.",
    specs: [["Écran", "الشاشة", "1,43\" AMOLED"], ["Autonomie", "الاستقلالية", "Jusqu'à 14 jours"], ["GPS", "GPS", "Double fréquence"]],
    variants: [{ color: c.black, price: 24900, compare: 29900, stock: 13 }, { color: c.silver, price: 24900, compare: 29900, stock: 6 }],
  },
  {
    slug: "xiaomi-smart-band-9", name: "Xiaomi Smart Band 9", brand: "Xiaomi", cat: "bracelets-connectes", featured: true, isNew: true,
    fr: "Bracelet d'activité à écran AMOLED 1,62\" : suivi du sommeil, fréquence cardiaque et 21 jours d'autonomie.",
    ar: "سوار نشاط بشاشة AMOLED مقاس 1.62 بوصة: تتبّع النوم ونبضات القلب واستقلالية 21 يومًا.",
    specs: [["Écran", "الشاشة", "1,62\" AMOLED"], ["Autonomie", "الاستقلالية", "Jusqu'à 21 jours"], ["Étanchéité", "مقاومة الماء", "5 ATM"]],
    variants: [{ color: c.black, price: 4490, compare: 5490, stock: 55 }, { color: c.pink, price: 4490, compare: 5490, stock: 24 }],
  },
  {
    slug: "huawei-band-9", name: "Huawei Band 9", brand: "Huawei", cat: "bracelets-connectes",
    fr: "Bracelet connecté ultra-fin avec suivi santé 24 h/24, plus de 100 modes sportifs et 14 jours d'autonomie.",
    ar: "سوار ذكي رفيع جدًا مع تتبّع صحي على مدار الساعة وأكثر من 100 وضع رياضي واستقلالية 14 يومًا.",
    specs: [["Écran", "الشاشة", "1,47\" AMOLED"], ["Modes sportifs", "الأوضاع الرياضية", "100+"], ["Autonomie", "الاستقلالية", "Jusqu'à 14 jours"]],
    variants: [{ color: c.green, price: 3990, stock: 40 }, { color: c.black, price: 3990, stock: 32 }],
  },
  {
    slug: "bracelet-sport-silicone-apple-watch", name: "Bracelet Sport silicone pour Apple Watch 46 mm", brand: "Spigen", cat: "bracelets-de-montre",
    fr: "Bracelet en silicone souple et respirant, fermoir sécurisé, compatible Apple Watch 42/44/45/46 mm.",
    ar: "حزام سيليكون ناعم ومريح مع قفل آمن، متوافق مع Apple Watch مقاسات 42/44/45/46 ملم.",
    specs: [["Matière", "المادة", "Silicone"], ["Compatibilité", "التوافق", "Apple Watch 42-46 mm"], ["Fermoir", "القفل", "Ardillon sécurisé"]],
    variants: [{ color: c.black, price: 1990, stock: 70 }, { color: c.blue, price: 1990, stock: 38 }, { color: c.pink, price: 1990, stock: 25 }],
  },
  {
    slug: "sony-wf-1000xm5", name: "Sony WF-1000XM5", brand: "Sony", cat: "ecouteurs", featured: true,
    fr: "Écouteurs sans fil avec la meilleure réduction de bruit Sony, audio Hi-Res et 8 h d'autonomie.",
    ar: "سماعات أذن لاسلكية بأفضل عزل ضوضاء من سوني وصوت عالي الدقة واستقلالية 8 ساعات.",
    specs: [["Réduction de bruit", "عزل الضوضاء", "Active, double processeur"], ["Autonomie", "الاستقلالية", "8 h (24 h avec boîtier)"], ["Connexion", "الاتصال", "Bluetooth 5.3"]],
    variants: [{ color: c.black, price: 22900, compare: 29900, stock: 18 }, { color: c.silver, price: 22900, compare: 29900, stock: 9 }],
  },
  {
    slug: "jbl-tune-buds", name: "JBL Tune Buds", brand: "JBL", cat: "ecouteurs",
    fr: "Écouteurs sans fil avec réduction de bruit active, son JBL Pure Bass et 48 h d'autonomie avec le boîtier.",
    ar: "سماعات أذن لاسلكية بعزل ضوضاء نشط وصوت JBL Pure Bass واستقلالية 48 ساعة مع العلبة.",
    specs: [["Réduction de bruit", "عزل الضوضاء", "Active adaptative"], ["Autonomie", "الاستقلالية", "12 h (48 h avec boîtier)"], ["Étanchéité", "مقاومة الماء", "IP54"]],
    variants: [{ color: c.black, price: 5900, compare: 9900, stock: 42 }, { color: c.white, price: 5900, compare: 9900, stock: 30 }],
  },
  {
    slug: "bose-quietcomfort-ultra", name: "Bose QuietComfort Ultra Headphones", brand: "Bose", cat: "casques-audio", isNew: true,
    fr: "Casque premium avec audio immersif, réduction de bruit de référence et confort exceptionnel.",
    ar: "سماعة رأس فاخرة بصوت محيطي وعزل ضوضاء مرجعي وراحة استثنائية.",
    specs: [["Réduction de bruit", "عزل الضوضاء", "Active, 3 modes"], ["Autonomie", "الاستقلالية", "Jusqu'à 24 h"], ["Audio", "الصوت", "Immersive Audio"]],
    variants: [{ color: c.black, price: 39900, compare: 44900, stock: 7 }, { color: c.white, price: 39900, compare: 44900, stock: 4 }],
  },
  {
    slug: "jbl-tune-770nc", name: "JBL Tune 770NC", brand: "JBL", cat: "casques-audio",
    fr: "Casque Bluetooth pliable avec réduction de bruit adaptative et jusqu'à 70 h d'autonomie.",
    ar: "سماعة رأس بلوتوث قابلة للطي بعزل ضوضاء متكيّف واستقلالية تصل إلى 70 ساعة.",
    specs: [["Réduction de bruit", "عزل الضوضاء", "Active adaptative"], ["Autonomie", "الاستقلالية", "Jusqu'à 70 h"], ["Connexion", "الاتصال", "Bluetooth 5.3"]],
    variants: [{ color: c.black, price: 7900, compare: 12900, stock: 33 }, { color: c.blue, price: 7900, compare: 12900, stock: 17 }],
  },
  {
    slug: "jbl-charge-5", name: "JBL Charge 5", brand: "JBL", cat: "enceintes-bluetooth", featured: true,
    fr: "Enceinte Bluetooth étanche IP67 avec powerbank intégrée et 20 h d'autonomie.",
    ar: "مكبّر صوت بلوتوث مقاوم للماء IP67 مع بطارية خارجية مدمجة واستقلالية 20 ساعة.",
    specs: [["Étanchéité", "مقاومة الماء", "IP67"], ["Autonomie", "الاستقلالية", "20 h"], ["Puissance", "القدرة", "40 W"]],
    variants: [{ color: c.black, price: 14900, compare: 18900, stock: 21 }, { color: c.blue, price: 14900, compare: 18900, stock: 12 }],
  },
  {
    slug: "marshall-emberton-ii", name: "Marshall Emberton II", brand: "Marshall", cat: "enceintes-bluetooth",
    fr: "Enceinte portable au design iconique, son 360° et plus de 30 h d'autonomie.",
    ar: "مكبّر صوت محمول بتصميم أيقوني وصوت 360° واستقلالية تتجاوز 30 ساعة.",
    specs: [["Autonomie", "الاستقلالية", "Plus de 30 h"], ["Étanchéité", "مقاومة الماء", "IP67"], ["Son", "الصوت", "True Stereophonic 360°"]],
    variants: [{ color: c.black, price: 13900, compare: 17900, stock: 15 }],
  },
  {
    slug: "samsung-hw-q600c", name: "Samsung Barre de son HW-Q600C", brand: "Samsung", cat: "barres-de-son", featured: true,
    fr: "Barre de son 3.1.2 canaux avec Dolby Atmos, caisson de basses sans fil et 360 W de puissance.",
    ar: "مكبّر صوت للتلفاز 3.1.2 قناة بتقنية Dolby Atmos وصندوق باس لاسلكي وقدرة 360 واط.",
    specs: [["Canaux", "القنوات", "3.1.2"], ["Puissance", "القدرة", "360 W"], ["Audio", "الصوت", "Dolby Atmos, DTS:X"]],
    variants: [{ color: c.black, price: 34900, compare: 44900, stock: 8 }],
  },
  {
    slug: "sony-ht-s2000", name: "Sony Barre de son HT-S2000", brand: "Sony", cat: "barres-de-son",
    fr: "Barre de son 3.1 avec Dolby Atmos et DTS:X, caisson de basses et connexion HDMI eARC.",
    ar: "مكبّر صوت للتلفاز 3.1 مع Dolby Atmos وDTS:X وصندوق باس ومنفذ HDMI eARC.",
    specs: [["Canaux", "القنوات", "3.1"], ["Puissance", "القدرة", "250 W"], ["Connexion", "الاتصال", "HDMI eARC, Bluetooth"]],
    variants: [{ color: c.black, price: 29900, compare: 36900, stock: 6 }],
  },
  {
    slug: "lenovo-ideapad-slim-5", name: "Lenovo IdeaPad Slim 5 15\"", brand: "Lenovo", cat: "ordinateurs-portables",
    fr: "Portable 15,6\" OLED léger avec Intel Core Ultra 5, 16 Go de RAM et SSD 512 Go.",
    ar: "حاسوب محمول خفيف بشاشة OLED مقاس 15.6 بوصة ومعالج Intel Core Ultra 5 وذاكرة 16 جيجا وSSD بسعة 512 جيجا.",
    specs: [["Écran", "الشاشة", "15,6\" OLED"], ["Processeur", "المعالج", "Intel Core Ultra 5"], ["Mémoire", "الذاكرة", "16 Go"]],
    variants: [{ color: c.gray, storage: "512 Go", price: 69900, compare: 79900, stock: 9 }],
  },
  {
    slug: "hp-pavilion-15", name: "HP Pavilion 15", brand: "HP", cat: "ordinateurs-portables",
    fr: "Portable polyvalent 15,6\" Full HD avec AMD Ryzen 5, 16 Go de RAM et SSD 512 Go pour le quotidien.",
    ar: "حاسوب محمول متعدد الاستخدامات بشاشة Full HD مقاس 15.6 بوصة ومعالج AMD Ryzen 5 وذاكرة 16 جيجا وSSD بسعة 512 جيجا.",
    specs: [["Écran", "الشاشة", "15,6\" Full HD IPS"], ["Processeur", "المعالج", "AMD Ryzen 5"], ["Mémoire", "الذاكرة", "16 Go"]],
    variants: [{ color: c.silver, storage: "512 Go", price: 54900, compare: 64900, stock: 11 }],
  },
  {
    slug: "asus-rog-zephyrus-g14", name: "ASUS ROG Zephyrus G14", brand: "ASUS", cat: "ordinateurs-portables", isNew: true,
    fr: "Portable gaming 14\" OLED 120 Hz, AMD Ryzen 9 et NVIDIA GeForce RTX 4060 dans un châssis compact.",
    ar: "حاسوب ألعاب محمول 14 بوصة بشاشة OLED بتردد 120 هرتز ومعالج AMD Ryzen 9 وبطاقة NVIDIA GeForce RTX 4060 في هيكل صغير.",
    specs: [["Écran", "الشاشة", "14\" OLED 120 Hz"], ["Processeur", "المعالج", "AMD Ryzen 9"], ["Graphique", "الرسوميات", "GeForce RTX 4060"]],
    variants: [{ color: c.gray, storage: "1 To", price: 169900, compare: 189900, stock: 3 }],
  },
  {
    slug: "samsung-odyssey-g5-27", name: "Samsung Odyssey G5 27\" QHD 165 Hz", brand: "Samsung", cat: "ecrans-moniteurs",
    fr: "Écran gaming incurvé 27\" QHD, 165 Hz et temps de réponse de 1 ms pour des parties fluides.",
    ar: "شاشة ألعاب منحنية 27 بوصة بدقة QHD وتردد 165 هرتز وزمن استجابة 1 ملّي ثانية لألعاب سلسة.",
    specs: [["Diagonale", "الحجم", "27\""], ["Résolution", "الدقة", "QHD 2560 × 1440"], ["Fréquence", "التردد", "165 Hz"]],
    variants: [{ color: c.black, price: 24900, compare: 29900, stock: 12 }],
  },
  {
    slug: "lg-ultragear-27gp850", name: "LG UltraGear 27\" Nano IPS 180 Hz", brand: "LG", cat: "ecrans-moniteurs",
    fr: "Moniteur Nano IPS 27\" QHD 180 Hz avec HDR400 et compatibilité G-Sync pour les joueurs exigeants.",
    ar: "شاشة Nano IPS مقاس 27 بوصة بدقة QHD وتردد 180 هرتز وHDR400 ودعم G-Sync للاعبين المتطلبين.",
    specs: [["Dalle", "اللوحة", "Nano IPS"], ["Résolution", "الدقة", "QHD"], ["Fréquence", "التردد", "180 Hz"]],
    variants: [{ color: c.black, price: 34900, compare: 41900, stock: 7 }],
  },
  {
    slug: "logitech-mx-keys-s", name: "Logitech MX Keys S", brand: "Logitech", cat: "claviers-souris",
    fr: "Clavier sans fil rétroéclairé à frappe confortable, multi-appareils et recharge USB-C.",
    ar: "لوحة مفاتيح لاسلكية بإضاءة خلفية وكتابة مريحة تدعم عدة أجهزة وشحن USB-C.",
    specs: [["Connexion", "الاتصال", "Bluetooth / Bolt"], ["Appareils", "الأجهزة", "Jusqu'à 3"], ["Autonomie", "الاستقلالية", "Jusqu'à 10 jours"]],
    variants: [{ color: c.gray, price: 11900, compare: 13900, stock: 20 }],
  },
  {
    slug: "logitech-mx-master-3s", name: "Souris Logitech MX Master 3S", brand: "Logitech", cat: "claviers-souris", featured: true,
    fr: "Souris ergonomique sans fil, capteur 8000 DPI, clics silencieux et molette MagSpeed.",
    ar: "فأرة لاسلكية مريحة بحساس 8000 DPI ونقرات صامتة وعجلة MagSpeed.",
    specs: [["Capteur", "الحساس", "8000 DPI"], ["Clics", "النقرات", "Silencieux"], ["Autonomie", "الاستقلالية", "Jusqu'à 70 jours"]],
    variants: [{ color: c.gray, price: 9900, compare: 11900, stock: 26 }, { color: c.black, price: 9900, compare: 11900, stock: 18 }],
  },
  {
    slug: "samsung-t7-ssd-1to", name: "Samsung SSD portable T7 1 To", brand: "Samsung", cat: "stockage",
    fr: "SSD externe USB 3.2 jusqu'à 1050 Mo/s, compact, robuste et chiffrement matériel.",
    ar: "قرص SSD خارجي USB 3.2 بسرعة تصل إلى 1050 ميغابايت/ث، صغير ومتين مع تشفير عتادي.",
    specs: [["Capacité", "السعة", "1 To"], ["Vitesse", "السرعة", "Jusqu'à 1050 Mo/s"], ["Interface", "الواجهة", "USB 3.2 Gen 2"]],
    variants: [{ color: c.gray, storage: "1 To", price: 9900, compare: 12900, stock: 28 }],
  },
  {
    slug: "sandisk-extreme-portable-2to", name: "SanDisk Extreme Portable SSD 2 To", brand: "SanDisk", cat: "stockage",
    fr: "SSD portable résistant à l'eau et à la poussière IP65, jusqu'à 1050 Mo/s.",
    ar: "قرص SSD محمول مقاوم للماء والغبار IP65 بسرعة تصل إلى 1050 ميغابايت/ث.",
    specs: [["Capacité", "السعة", "2 To"], ["Résistance", "المقاومة", "IP65"], ["Vitesse", "السرعة", "Jusqu'à 1050 Mo/s"]],
    variants: [{ color: c.black, storage: "2 To", price: 18900, compare: 22900, stock: 14 }],
  },
  {
    slug: "hp-deskjet-2820e", name: "Imprimante HP DeskJet 2820e", brand: "HP", cat: "imprimantes",
    fr: "Imprimante multifonction jet d'encre couleur (impression, copie, scan) avec Wi-Fi et application HP Smart.",
    ar: "طابعة متعددة الوظائف بالحبر الملوّن (طباعة ونسخ ومسح) مع Wi-Fi وتطبيق HP Smart.",
    specs: [["Fonctions", "الوظائف", "Impression, copie, scan"], ["Connexion", "الاتصال", "Wi-Fi, USB"], ["Technologie", "التقنية", "Jet d'encre couleur"]],
    variants: [{ color: c.white, price: 6900, compare: 8900, stock: 17 }],
  },
  {
    slug: "canon-pixma-g3560", name: "Imprimante Canon PIXMA G3560", brand: "Canon", cat: "imprimantes",
    fr: "Imprimante multifonction à réservoirs rechargeables : impressions économiques et Wi-Fi intégré.",
    ar: "طابعة متعددة الوظائف بخزانات حبر قابلة للتعبئة: طباعة اقتصادية وWi-Fi مدمج.",
    specs: [["Technologie", "التقنية", "Réservoirs rechargeables"], ["Fonctions", "الوظائف", "Impression, copie, scan"], ["Connexion", "الاتصال", "Wi-Fi, USB"]],
    variants: [{ color: c.black, price: 24900, compare: 28900, stock: 9 }],
  },
  {
    slug: "chargeur-magsafe-15w", name: "Chargeur sans fil MagSafe 15 W", brand: "Belkin", cat: "chargeurs",
    fr: "Chargeur sans fil magnétique 15 W pour iPhone, avec câble USB-C intégré.",
    ar: "شاحن لاسلكي مغناطيسي 15 واط للآيفون مع كابل USB-C مدمج.",
    specs: [["Puissance", "القدرة", "15 W"], ["Compatibilité", "التوافق", "iPhone 12 et ultérieurs"], ["Technologie", "التقنية", "MagSafe / Qi2"]],
    variants: [{ color: c.white, price: 3990, compare: 4990, stock: 44 }, { color: c.black, price: 3990, compare: 4990, stock: 36 }],
  },
  {
    slug: "chargeur-voiture-45w", name: "Chargeur voiture 45 W USB-C", brand: "Anker", cat: "chargeurs",
    fr: "Chargeur allume-cigare 2 ports (USB-C 45 W + USB-A) pour recharger smartphone et tablette en route.",
    ar: "شاحن للسيارة بمنفذين (USB-C بقدرة 45 واط وUSB-A) لشحن الهاتف واللوحي أثناء الطريق.",
    specs: [["Puissance", "القدرة", "45 W"], ["Ports", "المنافذ", "1 × USB-C, 1 × USB-A"], ["Usage", "الاستخدام", "Allume-cigare 12/24 V"]],
    variants: [{ color: c.black, price: 2490, stock: 52 }],
  },
  {
    slug: "cable-usb-c-lightning-1m", name: "Câble USB-C vers Lightning 1 m", brand: "Anker", cat: "cables",
    fr: "Câble certifié MFi pour iPhone, charge rapide et synchronisation, gaine tressée résistante.",
    ar: "كابل معتمد MFi للآيفون للشحن السريع والمزامنة بغلاف مجدول متين.",
    specs: [["Longueur", "الطول", "1 m"], ["Certification", "الاعتماد", "MFi"], ["Connecteurs", "الموصلات", "USB-C vers Lightning"]],
    variants: [{ color: c.white, price: 1990, stock: 90 }, { color: c.black, price: 1990, stock: 60 }],
  },
  {
    slug: "anker-nano-power-bank-10000", name: "Batterie externe Anker Nano 10 000 mAh", brand: "Anker", cat: "batteries-externes",
    fr: "Power bank compacte avec câble USB-C intégré, charge rapide 30 W et écran d'affichage.",
    ar: "بطارية خارجية صغيرة مع كابل USB-C مدمج وشحن سريع 30 واط وشاشة عرض.",
    specs: [["Capacité", "السعة", "10 000 mAh"], ["Puissance", "القدرة", "30 W"], ["Câble", "الكابل", "USB-C intégré"]],
    variants: [{ color: c.black, price: 3990, compare: 4990, stock: 48 }, { color: c.white, price: 3990, compare: 4990, stock: 27 }],
  },
  {
    slug: "coque-galaxy-s25-antichoc", name: "Coque antichoc pour Galaxy S25", brand: "Spigen", cat: "coques-protections",
    fr: "Coque robuste certifiée MIL-STD avec bords surélevés et coins renforcés.",
    ar: "غطاء متين معتمد MIL-STD بحواف مرتفعة وزوايا معززة.",
    specs: [["Compatibilité", "التوافق", "Galaxy S25"], ["Protection", "الحماية", "Antichoc MIL-STD"], ["Matière", "المادة", "TPU + polycarbonate"]],
    variants: [{ color: c.black, price: 2490, stock: 46 }, { color: c.blue, price: 2490, stock: 21 }],
  },
  {
    slug: "support-voiture-magnetique", name: "Support voiture magnétique MagSafe", brand: "Baseus", cat: "supports",
    fr: "Support de smartphone magnétique pour grille d'aération, orientable à 360° et compatible MagSafe.",
    ar: "حامل هاتف مغناطيسي لفتحة التكييف قابل للدوران 360° ومتوافق مع MagSafe.",
    specs: [["Fixation", "التثبيت", "Grille d'aération"], ["Rotation", "الدوران", "360°"], ["MagSafe", "MagSafe", "Oui"]],
    variants: [{ color: c.black, price: 1990, stock: 64 }],
  },
  {
    slug: "trepied-selfie-bluetooth", name: "Trépied perche à selfie Bluetooth", brand: "Ulanzi", cat: "supports",
    fr: "Perche à selfie extensible 1,2 m avec trépied et télécommande Bluetooth amovible.",
    ar: "عصا سيلفي قابلة للتمديد 1.2 م مع حامل ثلاثي وريموت بلوتوث قابل للفصل.",
    specs: [["Hauteur", "الارتفاع", "Jusqu'à 1,2 m"], ["Télécommande", "جهاز التحكم", "Bluetooth amovible"], ["Compatibilité", "التوافق", "Smartphones 4,7\" - 7\""]],
    variants: [{ color: c.black, price: 2290, stock: 39 }],
  },
  {
    slug: "fiido-d11-velo-electrique", name: "Fiido D11 Vélo électrique pliant", brand: "Fiido", cat: "velos-electriques", featured: true,
    fr: "Vélo électrique pliant ultra-léger : moteur 250 W, jusqu'à 100 km d'autonomie assistée et rangement facile.",
    ar: "دراجة كهربائية قابلة للطي خفيفة جدًا: محرك 250 واط ومدى مساعد يصل إلى 100 كم وتخزين سهل.",
    specs: [["Moteur", "المحرك", "250 W"], ["Autonomie", "المدى", "Jusqu'à 100 km"], ["Pliage", "الطي", "Oui"]],
    variants: [{ color: c.black, price: 79900, compare: 89900, stock: 5 }],
  },
  {
    slug: "engwe-ep-2-pro", name: "ENGWE EP-2 Pro Vélo électrique", brand: "ENGWE", cat: "velos-electriques", isNew: true,
    fr: "Vélo électrique pliant tout-terrain à gros pneus avec suspension, batterie 13 Ah et 7 vitesses.",
    ar: "دراجة كهربائية قابلة للطي لجميع التضاريس بإطارات عريضة ونظام تعليق وبطارية 13 أمبير و7 سرعات.",
    specs: [["Moteur", "المحرك", "750 W (pic)"], ["Batterie", "البطارية", "13 Ah"], ["Vitesses", "السرعات", "7"]],
    variants: [{ color: c.black, price: 119900, compare: 134900, stock: 3 }],
  },
  {
    slug: "tefal-blender-perfectmix", name: "Tefal Blender PerfectMix+", brand: "Tefal", cat: "cuisine",
    fr: "Blender puissant 1200 W avec carafe en verre de 2 L et programmes automatiques smoothies et soupes.",
    ar: "خلاط قوي 1200 واط بوعاء زجاجي سعة 2 لتر وبرامج تلقائية للعصائر والشوربات.",
    specs: [["Puissance", "القدرة", "1200 W"], ["Capacité", "السعة", "2 L"], ["Carafe", "الوعاء", "Verre"]],
    variants: [{ color: c.black, price: 9900, compare: 12900, stock: 16 }],
  },
  {
    slug: "delonghi-magnifica-evo", name: "De'Longhi Magnifica Evo", brand: "De'Longhi", cat: "cafe", featured: true,
    fr: "Machine à café automatique avec broyeur intégré et buse vapeur : espresso, café et cappuccino en un geste.",
    ar: "آلة قهوة أوتوماتيكية بمطحنة مدمجة ومخرج بخار: إسبريسو وقهوة وكابتشينو بلمسة واحدة.",
    specs: [["Type", "النوع", "Automatique avec broyeur"], ["Pression", "الضغط", "15 bars"], ["Réservoir", "الخزان", "1,8 L"]],
    variants: [{ color: c.silver, price: 39900, compare: 49900, stock: 6 }],
  },
  {
    slug: "nespresso-vertuo-pop", name: "Nespresso Vertuo Pop", brand: "Nespresso", cat: "cafe",
    fr: "Machine à capsules compacte : 5 tailles de tasse, chauffe en 30 secondes et réservoir de 0,6 L.",
    ar: "آلة قهوة بالكبسولات صغيرة الحجم: 5 أحجام للأكواب وتسخين خلال 30 ثانية وخزان 0.6 لتر.",
    specs: [["Type", "النوع", "Capsules Vertuo"], ["Tailles", "الأحجام", "5"], ["Réservoir", "الخزان", "0,6 L"]],
    variants: [{ color: c.white, price: 8900, compare: 12900, stock: 19 }, { color: c.black, price: 8900, compare: 12900, stock: 23 }],
  },
  {
    slug: "samsung-bespoke-rb38", name: "Samsung Réfrigérateur combiné Bespoke 387 L", brand: "Samsung", cat: "refrigerateurs",
    fr: "Réfrigérateur-congélateur No Frost de 387 L avec compresseur Digital Inverter et classe énergétique élevée.",
    ar: "ثلاجة بمجمّد No Frost سعة 387 لترًا بضاغط Digital Inverter وفئة طاقة عالية.",
    specs: [["Capacité", "السعة", "387 L"], ["Technologie", "التقنية", "No Frost"], ["Compresseur", "الضاغط", "Digital Inverter"]],
    variants: [{ color: c.silver, price: 64900, compare: 74900, stock: 4 }],
  },
  {
    slug: "lg-instaview-door-in-door", name: "LG Réfrigérateur américain InstaView 635 L", brand: "LG", cat: "refrigerateurs", isNew: true,
    fr: "Réfrigérateur américain 635 L avec panneau InstaView, distributeur d'eau et compresseur Inverter Linear.",
    ar: "ثلاجة أمريكية سعة 635 لترًا بلوحة InstaView وموزّع مياه وضاغط Inverter Linear.",
    specs: [["Capacité", "السعة", "635 L"], ["Panneau", "اللوحة", "InstaView"], ["Distributeur", "الموزّع", "Eau et glaçons"]],
    variants: [{ color: c.black, price: 119900, compare: 139900, stock: 2 }],
  },
  {
    slug: "sony-playstation-5-slim", name: "Sony PlayStation 5 Slim", brand: "Sony", cat: "consoles", featured: true,
    fr: "Console de salon 4K avec SSD ultra-rapide, lecteur Blu-ray et manette DualSense.",
    ar: "جهاز ألعاب منزلي بدقة 4K مع SSD فائق السرعة ومشغّل Blu-ray وذراع DualSense.",
    specs: [["Stockage", "التخزين", "1 To SSD"], ["Résolution", "الدقة", "Jusqu'à 4K 120 Hz"], ["Lecteur", "القارئ", "Blu-ray Ultra HD"]],
    variants: [{ color: c.white, storage: "1 To", price: 52900, stock: 10 }],
  },
  {
    slug: "xbox-series-x", name: "Microsoft Xbox Series X", brand: "Microsoft", cat: "consoles",
    fr: "Console 4K la plus puissante de Microsoft, SSD 1 To et compatibilité Game Pass.",
    ar: "أقوى جهاز ألعاب من مايكروسوفت بدقة 4K وSSD بسعة 1 تيرابايت ودعم Game Pass.",
    specs: [["Stockage", "التخزين", "1 To SSD"], ["Résolution", "الدقة", "Jusqu'à 4K 120 Hz"], ["Service", "الخدمة", "Compatible Game Pass"]],
    variants: [{ color: c.black, storage: "1 To", price: 49900, stock: 8 }],
  },
  {
    slug: "nintendo-switch-oled", name: "Nintendo Switch OLED", brand: "Nintendo", cat: "consoles",
    fr: "Console hybride avec écran OLED 7\", support réglable et son amélioré, à la maison comme en déplacement.",
    ar: "جهاز ألعاب هجين بشاشة OLED مقاس 7 بوصات وحامل قابل للتعديل وصوت محسّن للمنزل والتنقل.",
    specs: [["Écran", "الشاشة", "7\" OLED"], ["Stockage", "التخزين", "64 Go"], ["Modes", "الأوضاع", "Salon, portable, table"]],
    variants: [{ color: c.white, storage: "64 Go", price: 34900, compare: 37900, stock: 13 }],
  },
  {
    slug: "manette-dualsense-ps5", name: "Manette sans fil DualSense", brand: "Sony", cat: "manettes",
    fr: "Manette PS5 avec retour haptique, gâchettes adaptatives et micro intégré.",
    ar: "ذراع تحكم لجهاز PS5 مع اهتزاز لمسي وأزرار تكيّفية وميكروفون مدمج.",
    specs: [["Compatibilité", "التوافق", "PlayStation 5, PC"], ["Retour haptique", "الاهتزاز", "Oui"], ["Autonomie", "الاستقلالية", "Jusqu'à 12 h"]],
    variants: [{ color: c.white, price: 6490, stock: 34 }, { color: c.black, price: 6990, stock: 20 }],
  },
  {
    slug: "manette-xbox-wireless", name: "Manette sans fil Xbox", brand: "Microsoft", cat: "manettes",
    fr: "Manette ergonomique à surface texturée, bouton Partager et compatibilité Xbox, PC, mobile.",
    ar: "ذراع تحكم مريحة بسطح محبّب وزر مشاركة ومتوافقة مع Xbox والحاسوب والهاتف.",
    specs: [["Compatibilité", "التوافق", "Xbox, PC, mobile"], ["Connexion", "الاتصال", "Bluetooth / Xbox Wireless"], ["Autonomie", "الاستقلالية", "Piles AA"]],
    variants: [{ color: c.black, price: 5490, stock: 41 }, { color: c.blue, price: 5990, stock: 15 }],
  },
  {
    slug: "canon-eos-r50", name: "Canon EOS R50 + 18-45 mm", brand: "Canon", cat: "appareils-photo", featured: true,
    fr: "Appareil photo hybride compact 24 Mpx avec vidéo 4K et suivi de sujet intelligent, objectif 18-45 mm inclus.",
    ar: "كاميرا هجينة صغيرة بدقة 24 ميغابكسل وفيديو 4K وتتبّع ذكي للموضوع، مع عدسة 18-45 ملم.",
    specs: [["Capteur", "المستشعر", "APS-C 24,2 Mpx"], ["Vidéo", "الفيديو", "4K 30p"], ["Objectif", "العدسة", "RF-S 18-45 mm"]],
    variants: [{ color: c.black, price: 74900, compare: 82900, stock: 5 }, { color: c.white, price: 74900, compare: 82900, stock: 3 }],
  },
  {
    slug: "sony-zv-e10", name: "Sony ZV-E10 + 16-50 mm", brand: "Sony", cat: "appareils-photo",
    fr: "Appareil photo hybride pensé pour les créateurs de contenu, avec écran orientable et micro directionnel.",
    ar: "كاميرا هجينة مصممة لصنّاع المحتوى بشاشة قابلة للتدوير وميكروفون اتجاهي.",
    specs: [["Capteur", "المستشعر", "APS-C 24,2 Mpx"], ["Vidéo", "الفيديو", "4K 30p"], ["Écran", "الشاشة", "Orientable"]],
    variants: [{ color: c.black, price: 69900, compare: 79900, stock: 4 }],
  },
  {
    slug: "gopro-hero13-black", name: "GoPro HERO13 Black", brand: "GoPro", cat: "cameras-sport", featured: true,
    fr: "Caméra sportive étanche à 10 m, vidéo 5,3K et stabilisation HyperSmooth pour toutes vos aventures.",
    ar: "كاميرا حركة مقاومة للماء حتى 10 م بفيديو 5.3K وتثبيت HyperSmooth لجميع مغامراتك.",
    specs: [["Vidéo", "الفيديو", "5,3K 60p"], ["Étanchéité", "مقاومة الماء", "10 m"], ["Stabilisation", "التثبيت", "HyperSmooth 6.0"]],
    variants: [{ color: c.black, price: 39900, compare: 44900, stock: 14 }],
  },
  {
    slug: "dji-osmo-action-4", name: "DJI Osmo Action 4", brand: "DJI", cat: "cameras-sport",
    fr: "Caméra sportive à grand capteur 1/1,3\", vidéo 4K 120 fps et double écran tactile.",
    ar: "كاميرا حركة بمستشعر كبير 1/1.3 بوصة وفيديو 4K بمعدل 120 إطارًا وشاشتين لمسيتين.",
    specs: [["Capteur", "المستشعر", "1/1,3\""], ["Vidéo", "الفيديو", "4K 120 fps"], ["Étanchéité", "مقاومة الماء", "18 m"]],
    variants: [{ color: c.black, price: 28900, compare: 34900, stock: 9 }],
  },
  {
    slug: "dji-mini-4-pro", name: "DJI Mini 4 Pro", brand: "DJI", cat: "drones", featured: true, isNew: true,
    fr: "Drone pliable de moins de 249 g avec vidéo 4K HDR, détection d'obstacles omnidirectionnelle et 34 min de vol.",
    ar: "طائرة مسيّرة قابلة للطي بوزن أقل من 249 غ وفيديو 4K HDR واستشعار عقبات في جميع الاتجاهات و34 دقيقة طيران.",
    specs: [["Poids", "الوزن", "Moins de 249 g"], ["Vidéo", "الفيديو", "4K HDR 60 fps"], ["Autonomie", "مدة الطيران", "34 min"]],
    variants: [{ color: c.gray, price: 79900, compare: 84900, stock: 6 }],
  },
  {
    slug: "dji-mini-3", name: "DJI Mini 3", brand: "DJI", cat: "drones",
    fr: "Drone compact et léger idéal pour débuter : vidéo 4K, 38 min de vol et transmission HD.",
    ar: "طائرة مسيّرة صغيرة وخفيفة مثالية للمبتدئين: فيديو 4K و38 دقيقة طيران ونقل عالي الدقة.",
    specs: [["Vidéo", "الفيديو", "4K HDR"], ["Autonomie", "مدة الطيران", "38 min"], ["Poids", "الوزن", "Moins de 249 g"]],
    variants: [{ color: c.gray, price: 44900, compare: 54900, stock: 8 }],
  },
  {
    slug: "tp-link-tapo-c210", name: "TP-Link Tapo C210 Caméra Wi-Fi", brand: "TP-Link", cat: "cameras-surveillance",
    fr: "Caméra de surveillance intérieure 3 Mpx pivotante, vision nocturne et détection de mouvement.",
    ar: "كاميرا مراقبة داخلية 3 ميغابكسل قابلة للدوران برؤية ليلية وكشف الحركة.",
    specs: [["Résolution", "الدقة", "3 Mpx (2K)"], ["Vision nocturne", "الرؤية الليلية", "Jusqu'à 9 m"], ["Stockage", "التخزين", "microSD jusqu'à 512 Go"]],
    variants: [{ color: c.white, price: 2990, compare: 3990, stock: 58 }],
  },
  {
    slug: "xiaomi-smart-camera-c400", name: "Xiaomi Smart Camera C400", brand: "Xiaomi", cat: "cameras-surveillance",
    fr: "Caméra Wi-Fi 2,5K à vision nocturne couleur, suivi automatique et audio bidirectionnel.",
    ar: "كاميرا Wi-Fi بدقة 2.5K برؤية ليلية ملوّنة وتتبّع تلقائي وصوت ثنائي الاتجاه.",
    specs: [["Résolution", "الدقة", "2,5K"], ["Suivi", "التتبّع", "Automatique"], ["Audio", "الصوت", "Bidirectionnel"]],
    variants: [{ color: c.white, price: 3490, stock: 47 }],
  },
  {
    slug: "philips-hue-starter-kit", name: "Philips Hue Kit de démarrage White & Color", brand: "Philips", cat: "eclairage-connecte", featured: true,
    fr: "3 ampoules E27 connectées 16 millions de couleurs avec pont Hue, pilotables par application ou voix.",
    ar: "3 مصابيح E27 ذكية بـ16 مليون لون مع جسر Hue، قابلة للتحكم عبر التطبيق أو الصوت.",
    specs: [["Ampoules", "المصابيح", "3 × E27"], ["Couleurs", "الألوان", "16 millions"], ["Pont", "الجسر", "Hue Bridge inclus"]],
    variants: [{ color: c.white, price: 13900, compare: 17900, stock: 15 }],
  },
  {
    slug: "xiaomi-smart-led-bulb-essential", name: "Xiaomi Smart LED Bulb Essential", brand: "Xiaomi", cat: "eclairage-connecte",
    fr: "Ampoule LED connectée E27 multicolore, compatible Google Home et Alexa.",
    ar: "مصباح LED ذكي E27 متعدد الألوان متوافق مع Google Home وAlexa.",
    specs: [["Culot", "القاعدة", "E27"], ["Puissance", "القدرة", "9 W"], ["Compatibilité", "التوافق", "Google Home, Alexa"]],
    variants: [{ color: c.white, price: 1290, stock: 100 }],
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
    .values(categories.map(({ parent: _parent, ...row }) => row))
    .returning();
  const catId = new Map(cats.map((x) => [x.slug, x.id]));
  for (const row of categories.filter((x) => x.parent)) {
    await db.update(s.categories).set({ parentId: catId.get(row.parent!)! }).where(sql`${s.categories.id} = ${catId.get(row.slug)!}`);
  }
  const parents = new Set(categories.map((x) => x.parent).filter(Boolean));
  for (const p of items) {
    if (!catId.has(p.cat) || parents.has(p.cat)) throw new Error(`Product ${p.slug} must belong to a leaf category, got "${p.cat}"`);
  }

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
        condition: p.condition ?? "new",
        warrantyMonths: p.warranty ?? 24,
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

  // Shop stock: variants without any row get their quantity in the main shop.
  await db.execute(sql`insert into variant_stock (variant_id, store_id, qty) select v.id, s.id, v.stock from variants v cross join stores s where s.is_main and not exists (select 1 from variant_stock x where x.variant_id = v.id) on conflict do nothing`);
  console.log(`Seeded ${cats.length} categories (${parents.size} families), ${items.length} products, 2 coupons`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
