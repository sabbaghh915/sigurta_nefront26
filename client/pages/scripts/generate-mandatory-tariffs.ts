import fs from "fs";
import path from "path";
import xlsx from "xlsx";

const argFile = process.argv.find((a) => a.startsWith("--file="))?.split("=")[1];
if (!argFile) {
  console.error('Usage: npx tsx scripts/generate-mandatory-tariffs.ts --file="C:\\path\\tariff.xlsx"');
  process.exit(1);
}

const filePath = path.resolve(argFile);
const wb = xlsx.readFile(filePath);

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// ---------- Internal ----------
const shInternal = wb.Sheets["Internal"];
const rowsI = xlsx.utils.sheet_to_json<any[]>(shInternal, { header: 1, defval: "" });

// ابحث عن سطر العناوين الذي يحتوي "الرمز" و "نوع المركبة" و "الفئة"
const headerIdxI = rowsI.findIndex((r) => r.includes("الرمز") && r.includes("نوع المركبة") && r.includes("الفئة"));
if (headerIdxI === -1) throw new Error("Internal header row not found");

const headerI = rowsI[headerIdxI].map((c) => String(c).trim());
const col = (name: string) => headerI.findIndex((c) => c === name);

const idxCode = col("الرمز");
const idxVeh = col("نوع المركبة");
const idxCat = col("الفئة");
const idxNet = col("البدل الصافي الجديد");
const idxStamp = col("رسم الطابع");
const idxWar = col("مجهود حربي");
const idxLocal = col("الادارة المحلية");
const idxRecon = col("اعمار");
const idxMartyr = col("طابع شهيد");
const idxTotal = col("الإجمالي");

const internalTariffs: Record<string, any> = {};
const internalTypesMap: Record<string, string> = {};

for (let i = headerIdxI + 1; i < rowsI.length; i++) {
  const r = rowsI[i];
  const codeRaw = r[idxCode];
  const catRaw = String(r[idxCat] || "").trim();
  const vehLabel = String(r[idxVeh] || "").trim();

  const code = Number(codeRaw);
  if (!code || !catRaw || !vehLabel) continue;

  const catCode = catRaw.slice(0, 2); // "01".."04"
  // تحويل الرمز الحقيقي إلى baseType (01..34)
  const base =
    catCode === "01" ? code :
    catCode === "02" ? code - 34 :
    catCode === "03" ? code - 68 :
    catCode === "04" ? code - 102 :
    NaN;

  if (!base || base < 1 || base > 34) continue;

  const key = `${catCode}-${pad2(base)}`;

  internalTariffs[key] = {
    netPremium: Number(r[idxNet] || 0),
    stampFee: Number(r[idxStamp] || 0),
    warEffort: Number(r[idxWar] || 0),
    localAdministration: Number(r[idxLocal] || 0),
    reconstruction: Number(r[idxRecon] || 0),
    martyrFund: Number(r[idxMartyr] || 0),
    total: Number(r[idxTotal] || 0),
    label: vehLabel,
  };

  // خذ أسماء الأنواع من فئة 01 فقط
  if (catCode === "01") internalTypesMap[pad2(base)] = vehLabel;
}

// ---------- Border ----------
const shBorder = wb.Sheets["Border"];
const rowsB = xlsx.utils.sheet_to_json<any[]>(shBorder, { header: 1, defval: "" });

const headerIdxB = rowsB.findIndex((r) => r.includes("الرمز") && r.includes("نوع المركبة") && r.includes("المدة"));
if (headerIdxB === -1) throw new Error("Border header row not found");

const headerB = rowsB[headerIdxB].map((c) => String(c).trim());
const colB = (name: string) => headerB.findIndex((c) => c === name);

const bTypeIdx = colB("نوع المركبة");
const bDurIdx = colB("المدة");
const bNetIdx = colB("البدل المقترح");
const bStampIdx = colB("رسم الطابع");
const bWarIdx = colB("مجهود حربي");
const bLocalIdx = colB("الادارة المحلية");
const bReconIdx = colB("رسم اعمار");
const bMartyrIdx = colB("طابع الشهيد");
const bTotalIdx = colB("الإجمالي");

const typeMap: Record<string, string> = {
  "سياحية": "tourist",
  "دراجة نارية": "motorcycle",
  "باص": "bus",
  "بقية الفئات": "other",
};

const monthsFrom = (s: string) => (s.includes("3") ? 3 : s.includes("6") ? 6 : 12);

const borderTariffs: Record<string, any> = {};
for (let i = headerIdxB + 1; i < rowsB.length; i++) {
  const r = rowsB[i];
  const t = typeMap[String(r[bTypeIdx] || "").trim()];
  const m = monthsFrom(String(r[bDurIdx] || "").trim());
  if (!t) continue;

  const key = `${t}-${m}`;
  borderTariffs[key] = {
    netPremium: Number(r[bNetIdx] || 0),
    stampFee: Number(r[bStampIdx] || 0),
    warEffort: Number(r[bWarIdx] || 0),
    localAdministration: Number(r[bLocalIdx] || 0),
    reconstruction: Number(r[bReconIdx] || 0),
    martyrFund: Number(r[bMartyrIdx] || 0),
    total: Number(r[bTotalIdx] || 0),
  };
}

// ---------- Write TS ----------
const outPath = path.resolve(process.cwd(), "src/constants/mandatoryTariffs.ts");
const internalTypesArr = Object.entries(internalTypesMap)
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .map(([value, label]) => ({ value, label }));

const content = `// AUTO-GENERATED from: ${path.basename(filePath)}
export const INTERNAL_TARIFFS = ${JSON.stringify(internalTariffs, null, 2)} as const;

export const BORDER_TARIFFS = ${JSON.stringify(borderTariffs, null, 2)} as const;

export const INTERNAL_VEHICLE_TYPES = ${JSON.stringify(internalTypesArr, null, 2)} as const;
`;

fs.writeFileSync(outPath, content, "utf-8");
console.log("✅ Generated:", outPath);
console.log("Internal keys:", Object.keys(internalTariffs).length, "Border keys:", Object.keys(borderTariffs).length);
