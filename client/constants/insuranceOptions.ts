// src/constants/mandatoryInsuranceOptions.ts
// ✅ خيارات التأمين الإلزامي (داخلي/حدودي) — مستخرجة من ملف التعرفة 15-7-2024

export const INSURANCE_CATEGORIES = [
  { value: "01", label: "خاصة (أفراد)" },
  { value: "02", label: "عامة (تجارية)" },
  { value: "03", label: "حكومية" },
  { value: "04", label: "تأجير" }, // في ملف الإكسل مكتوبة: "تاجير"
] as const;

export const CLASSIFICATIONS = [
  { value: "0", label: "غير حكومية (عادي)" },
  { value: "1", label: "حكومية (خصم خاص)" },
  { value: "2", label: "تخفيض طابع" },
  { value: "3", label: "إعفاء طابع" },
] as const;

export const PERIODS_MONTHS = [
  { value: 12, label: "سنة كاملة (12 شهر)" },
  { value: 6, label: "ستة أشهر" },
  { value: 3, label: "ثلاثة أشهر" },
] as const;

/**
 * ✅ داخلي (Internal)
 * ملاحظة مهمة: في ملف التعرفة يوجد "الرمز" من 1 إلى 34 لفئة (01-خاصة)،
 * وباقي الفئات تكون بنفس الترتيب لكن بأوفست 34:
 * 02-عامة: +34  | 03-حكومي: +68 | 04-تأجير: +102
 */
export const INTERNAL_VEHICLE_TYPES = [
  { value: "01", label: "01- سياحية قوة محرك حتى 20" },
  { value: "02", label: "01- نقل وركوب قوة محرك حتى 20" },
  { value: "03", label: "14- سياحية قوة محرك 21 وأكثر" },
  { value: "04", label: "14- نقل وركوب قوة محرك 21 وأكثر" },
  { value: "05", label: "15- ميكرو باص حتى 25 راكب" },
  { value: "06", label: "13- باص بولمان 26 راكب وأكثر" },
  { value: "07", label: "07- بيك آب حتى 3500 كغ قوة محرك 20" },
  { value: "08", label: "07- شاحنة براد قوة محرك حتى 20" },
  { value: "09", label: "07- شاحنة صهريج قوة محرك حتى 20" },
  { value: "10", label: "05- بيك آب حتى 3500 كغ قوة محرك 21 - 40" },
  { value: "11", label: "05- شاحنة فوق 3500 كغ قوة محرك 21 - 40" },
  { value: "12", label: "05- شاحنة صهريج قوة محرك 21 - 40" },
  { value: "13", label: "05- شاحنة براد قوة محرك 21 - 40" },
  { value: "14", label: "06- شاحنة قوة محرك 41 وأكثر" },
  { value: "15", label: "06- شاحنة صهريج قوة محرك 41 وأكثر" },
  { value: "16", label: "06- شاحنة براد قوة محرك 41 وأكثر" },
  { value: "17", label: "17- شاحنة + مقطورة" },
  { value: "18", label: "18- قاطرة ونصف مقطورة" },
  { value: "19", label: "18- قاطرة ونصف مقطورة براد" },
  { value: "20", label: "18- قاطرة ونصف مقطورة صهريج" },
  { value: "21", label: "03- آليات أشغال إسعاف إطفاء روافع قوة محرك 1 - 20" },
  { value: "22", label: "03- آليات أشغال جبالة مضخة تنظيف قوة محرك 1 - 20" },
  { value: "23", label: "03- آليات الأشغال الزراعية قوة محرك 1 - 20" },
  { value: "24", label: "02- آليات أشغال إسعاف إطفاء روافع قوة محرك 21 - 40" },
  { value: "25", label: "02- آليات أشغال جبالة مضخة تنظيف قوة محرك 21 - 40" },
  { value: "26", label: "02- آليات الأشغال الزراعية قوة محرك 21 - 40" },
  { value: "27", label: "04- آليات أشغال إسعاف إطفاء روافع قوة محرك41وأكثر" },
  { value: "28", label: "04- آليات أشغال جبالة مضخة تنظيف قوة محرك41وأكثر" },
  { value: "29", label: "04- آليات الأشغال الزراعية قوة محرك 41 وأكثر" },
  { value: "30", label: "08- جرار زراعي قوة محرك 1 - 30" },
  { value: "31", label: "09- جرار زراعي قوة محرك 31 وأكثر" },
  { value: "32", label: "12- دراجة آلية عجلتان" },
  { value: "33", label: "10- دراجة آلية 3 عجلات / عزاقة قوة محرك 1 - 20" },
  { value: "34", label: "11- دراجة آلية 3 عجلات / عزاقة قوة محرك 21 وأكثر" },
] as const;

export const BORDER_VEHICLE_TYPES = [
  { value: "tourist", label: "سيارات سياحية (حدودي)" },
  { value: "motorcycle", label: "دراجات نارية (حدودي)" },
  { value: "bus", label: "باصات نقل (حدودي)" },
  { value: "other", label: "بقية الفئات (حدودي)" },
] as const;

// --------- Helpers (اختياري لكن عملي جداً) ---------

export type InsuranceCategoryValue = (typeof INSURANCE_CATEGORIES)[number]["value"];
export type ClassificationValue = (typeof CLASSIFICATIONS)[number]["value"];
export type PeriodMonthsValue = (typeof PERIODS_MONTHS)[number]["value"];
export type InternalVehicleTypeValue = (typeof INTERNAL_VEHICLE_TYPES)[number]["value"];
export type BorderVehicleTypeValue = (typeof BORDER_VEHICLE_TYPES)[number]["value"];

/**
 * يحوّل "رمز داخلي أساسي" (1..34) إلى "رمز التعرفة الفعلي" حسب الفئة:
 * 01: +0 | 02: +34 | 03: +68 | 04: +102
 */
export const INTERNAL_CATEGORY_OFFSETS: Record<InsuranceCategoryValue, number> = {
  "01": 0,
  "02": 34,
  "03": 68,
  "04": 102,
};

export function getInternalTariffCode(baseType01to34: number, category: InsuranceCategoryValue) {
  return baseType01to34 + INTERNAL_CATEGORY_OFFSETS[category];
}

/**
 * (حدودي) في ملف التعرفة الأكواد تأتي هكذا:
 * سياحية: 2/3/4  | باص: 6/7/8 | بقية الفئات: 10/11/12 | دراجة: 14/15/16
 */
export const BORDER_TYPE_BASE_CODE: Record<BorderVehicleTypeValue, number> = {
  tourist: 2,
  bus: 6,
  other: 10,
  motorcycle: 14,
};

export function getBorderTariffCode(borderType: BorderVehicleTypeValue, months: PeriodMonthsValue) {
  const idx = months === 3 ? 0 : months === 6 ? 1 : 2; // 12 => 2
  return BORDER_TYPE_BASE_CODE[borderType] + idx;
}
