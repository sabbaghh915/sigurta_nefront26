import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Car, CreditCard, ArrowLeft, CheckCircle, DollarSign, Calendar, User, FileText } from "lucide-react";

// ✅ عدّل حسب مشروعك
import {
  INTERNAL_VEHICLE_TYPES,
  INSURANCE_CATEGORIES,
  CLASSIFICATIONS,
  PERIODS_MONTHS,
  BORDER_VEHICLE_TYPES,
} from "../constants/insuranceOptions";

interface VehicleDataView {
  ownerName: string;
  nationalId: string;
  phoneNumber: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: string;
  policyDuration?: string;
  coverage?: string;
  vehicleId?: string;
}

type PricingInput =
  | {
      insuranceType: "internal";
      vehicleCode: string;
      category: string;
      classification: string;
      months: number;

      electronicCard: boolean;
      premiumService: boolean;
      rescueService: boolean;
    }
  | {
      insuranceType: "border";
      borderVehicleType: string;
      months: number;
    };

type PricingCfg = {
  internal: Record<string, number>;
  border: Record<string, number>;
  internalMeta?: Record<string, { label: string; group: string; duration: string }>;
  borderMeta?: Record<string, { label: string; group: string; duration: string }>;
  version?: number;
  updatedAt?: string;
};


type QuoteBreakdown = {
  netPremium: number;
  stampFee: number;
  warEffort: number;
  localAdmin: number;
  martyrStamp: number;
  reconstruction: number;

  electronicCardFee: number;
  premiumServiceFee: number;
  rescueServiceFee: number;

  subtotal: number;
  total: number;
};

function durationToMonths(duration?: string) {
  if (!duration) return 12;
  const d = String(duration).toLowerCase();
  if (d.includes("1year") || d.includes("year") || d.includes("12")) return 12;
  if (d.includes("6")) return 6;
  if (d.includes("3")) return 3;
  if (d.includes("2")) return 2;
  if (d.includes("1")) return 1;
  return 12;
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ✅ حل مشكلة RTL: اطبع رقم + "ل.س" بشكل ثابت
function formatCurrency(amount: number) {
  const v = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${new Intl.NumberFormat("ar-SY").format(v)} ل.س`;
}

function moneySpan(value: string) {
  return (
    <span dir="ltr" className="whitespace-nowrap tabular-nums">
      {value}
    </span>
  );
}

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function parseDatetimeLocal(v: string) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function addMonthsSafe(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Number(months || 0));
  return d;
}

function formatDateTime(dateStringOrDate: string | Date) {
  const d = typeof dateStringOrDate === "string" ? new Date(dateStringOrDate) : dateStringOrDate;
  return d.toLocaleString("ar-SY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Payment() {
  const navigate = useNavigate();

  const [vehicleData, setVehicleData] = useState<VehicleDataView | null>(null);

  const [paymentMethod, setPaymentMethod] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const [pricingInput, setPricingInput] = useState<PricingInput | null>(null);

  const [quote, setQuote] = useState<QuoteBreakdown | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // ✅ اختياري: جلب نسخة التسعير (لا يؤثر على الحساب)
  const [pricingCfg, setPricingCfg] = useState<PricingCfg | null>(null);

  const [policyStartAt, setPolicyStartAt] = useState<string>("");

  // خيارات آمنة
  const internalVehicleOptions = useMemo(() => {
  const meta = pricingCfg?.internalMeta;
  if (!meta) return [];

  // نجمع حسب vehicleCode (قبل الشرطة) ونأخذ group كـ label
  const map = new Map<string, string>();
  for (const [key, m] of Object.entries(meta)) {
    const vehicleCode = key.split("-")[0]; // 01a من 01a-01
    if (!map.has(vehicleCode)) map.set(vehicleCode, m.group);
  }

  const list = Array.from(map.entries()).map(([value, label]) => ({ value, label }));

  // ترتيب منطقي: الأرقام أولاً ثم الكهربائي آخر شي
  const rank = (v: string) => {
    if (v.startsWith("elec-")) return 9999;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 8888;
  };

  list.sort((a, b) => {
    const ra = rank(a.value);
    const rb = rank(b.value);
    if (ra !== rb) return ra - rb;
    return a.value.localeCompare(b.value);
  });

  return list;
}, [pricingCfg]);



  const categoryOptions = useMemo(
    () =>
      (INSURANCE_CATEGORIES as unknown as any[])?.map((o) => ({
        value: String(o.value ?? o.code ?? o.id ?? ""),
        label: String(o.label ?? o.name ?? o.title ?? o.value ?? ""),
      })) ?? [],
    []
  );

  const classificationOptions = useMemo(
    () =>
      (CLASSIFICATIONS as unknown as any[])?.map((o) => ({
        value: String(o.value ?? o.code ?? o.id ?? ""),
        label: String(o.label ?? o.name ?? o.title ?? o.value ?? ""),
      })) ?? [],
    []
  );

  const periodOptions = useMemo(
    () =>
      (PERIODS_MONTHS as unknown as any[])?.map((o) => ({
        value: String(o.value ?? o.months ?? o.id ?? ""),
        label: String(o.label ?? o.name ?? o.title ?? o.value ?? ""),
      })) ?? [],
    []
  );

  const borderTypeOptions = useMemo(() => {
  const meta = pricingCfg?.borderMeta;
  if (!meta) return [];

  const map = new Map<string, string>();
  for (const [key, m] of Object.entries(meta)) {
    const type = key.split("-")[0]; // tourist من tourist-12
    if (!map.has(type)) map.set(type, m.group); // group: سياحية/باص...
  }

  const list = Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  list.sort((a, b) => a.value.localeCompare(b.value));
  return list;
}, [pricingCfg]);


useEffect(() => {
  if (!pricingCfg || !pricingInput) return;

  if (pricingInput.insuranceType === "internal") {
    const options = internalVehicleOptions.map((o) => o.value);
    if (!options.length) return;

    if (!options.includes(pricingInput.vehicleCode)) {
      // ترقيع سريع: لو كانت "01" خلّيها "01a" (أول match يبدأ بـ 01)
      const prefix = String(pricingInput.vehicleCode || "").trim();
      const guessed =
        options.find((v) => v === prefix) ||
        options.find((v) => v.startsWith(prefix)) ||
        options[0];

      setPricingInput((prev) =>
        prev && prev.insuranceType === "internal" ? { ...prev, vehicleCode: guessed } : prev
      );
    }
  }

  if (pricingInput.insuranceType === "border") {
    const options = borderTypeOptions.map((o) => o.value);
    if (!options.length) return;

    if (!options.includes(pricingInput.borderVehicleType)) {
      setPricingInput((prev) =>
        prev && prev.insuranceType === "border" ? { ...prev, borderVehicleType: options[0] } : prev
      );
    }
  }
}, [pricingCfg, internalVehicleOptions, borderTypeOptions, pricingInput]);



  // 1) اقرأ بيانات المركبة من localStorage + اعدادات افتراضية
  useEffect(() => {
    const syrianRaw = localStorage.getItem("vehicleData");
    const foreignRaw = localStorage.getItem("foreignVehicleData");

    const now = new Date();
    setPolicyStartAt(toDatetimeLocalValue(now));

    if (syrianRaw) {
      const data = JSON.parse(syrianRaw);

      setVehicleData({
        ownerName: data.ownerName ?? "",
        nationalId: data.nationalId ?? data.nationalID ?? "",
        phoneNumber: data.phoneNumber ?? "",
        plateNumber: data.plateNumber ?? "",
        brand: data.brand ?? "",
        model: data.model ?? "",
        year: String(data.year ?? ""),
        policyDuration: data.policyDuration,
        coverage: data.coverage,
        vehicleId: data.vehicleId,
      });

      setPricingInput({
        insuranceType: "internal",
        vehicleCode: data.vehicleCode ?? data.internalVehicleType ?? "",
        category: data.category ?? "",
        classification: String(data.classification ?? "0"),
        months: Number(data.months ?? durationToMonths(data.policyDuration)),

        electronicCard: Boolean(data.electronicCard ?? false),
        premiumService: Boolean(data.premiumService ?? false),
        rescueService: Boolean(data.rescueService ?? false),
      });

      return;
    }

    if (foreignRaw) {
      const data = JSON.parse(foreignRaw);

      setVehicleData({
        ownerName: data.ownerName ?? "",
        nationalId: data.passportNumber ?? data.nationalId ?? "",
        phoneNumber: data.phoneNumber ?? "",
        plateNumber: data.plateNumber ?? "",
        brand: data.brand ?? "",
        model: data.model ?? "",
        year: String(data.year ?? ""),
        policyDuration: data.policyDuration,
        coverage: data.coverage,
        vehicleId: data.vehicleId,
      });

      setPricingInput({
        insuranceType: "border",
        borderVehicleType: data.borderVehicleType ?? "",
        months: Number(data.insuranceMonths ?? durationToMonths(data.policyDuration)),
      });

      return;
    }

    navigate("/");
  }, [navigate]);

  // 2) حساب السعر من الباك (الذي يأخذ التسعير من DB)
  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      if (!pricingInput) return;

      // تحقق سريع
      if (pricingInput.insuranceType === "internal") {
        if (!pricingInput.vehicleCode || !pricingInput.category || !pricingInput.classification || !pricingInput.months) {
          setQuote(null);
          return;
        }
      } else {
        if (!pricingInput.borderVehicleType || !pricingInput.months) {
          setQuote(null);
          return;
        }
      }

      try {
        setQuoteLoading(true);
        setQuoteError(null);

        const token = localStorage.getItem("authToken");

        const res = await fetch("/api/insurance/calculate", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(pricingInput),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);

        const payload = json?.data ?? json;
        const b = payload?.breakdown ?? payload;

        const eFee = safeNum(b?.electronicCardFee);
        const pFee = safeNum(b?.premiumServiceFee);
        const rFee = safeNum(b?.rescueServiceFee);
        const total = safeNum(payload?.total ?? b?.total);
        const subtotal = safeNum(b?.subtotal) || Math.max(0, total - eFee - pFee - rFee);

        setQuote({
          netPremium: safeNum(b?.netPremium),
          stampFee: safeNum(b?.stampFee),
          warEffort: safeNum(b?.warEffort ?? b?.warFee),

          localAdmin: safeNum(b?.localAdmin ?? b?.localFee),
          martyrStamp: safeNum(b?.martyrStamp ?? b?.martyrFee),
          reconstruction: safeNum(b?.reconstruction ?? b?.reconFee),

          electronicCardFee: eFee,
          premiumServiceFee: pFee,
          rescueServiceFee: rFee,

          subtotal,
          total,
        });
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setQuote(null);
        setQuoteError(e?.message || "فشل حساب التأمين");
      } finally {
        setQuoteLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, [pricingInput]);

  // 3) (اختياري) جلب نسخة التسعير — تجاهله إذا 404
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch("/api/pricing/active", {
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) return; // 404؟ تجاهل
        const j = await res.json().catch(() => null);
        setPricingCfg(j?.data ?? j ?? null);
      } catch {
        setPricingCfg(null);
      }
    })();

    return () => controller.abort();
  }, []);

  const getStoredVehicle = () => {
    const sy = localStorage.getItem("vehicleData");
    if (sy) return { key: "vehicleData", data: JSON.parse(sy) };

    const fr = localStorage.getItem("foreignVehicleData");
    if (fr) return { key: "foreignVehicleData", data: JSON.parse(fr) };

    return null;
  };

  const handlePayment = async () => {
    if (!vehicleData || !paymentMethod) return;

    if (!quote || !pricingInput) {
      alert("احسب السعر أولاً من بيانات التسعير");
      return;
    }

    setIsProcessing(true);

    try {
      const stored = getStoredVehicle();
      const vehicleId = stored?.data?.vehicleId || vehicleData.vehicleId;

      if (!vehicleId || typeof vehicleId !== "string") {
        alert("خطأ: vehicleId غير موجود أو ليس نصاً");
        return;
      }

      const issuedAtIso = new Date().toISOString();
      const months = Number((pricingInput as any).months || 12);

      const startAtObj = parseDatetimeLocal(policyStartAt) || new Date();
      const endAtObj = addMonthsSafe(startAtObj, months);

      const policyStartAtIso = startAtObj.toISOString();
      const policyEndAtIso = endAtObj.toISOString();

      const { vehicleApi, paymentApi } = await import("../services/api");

      // snapshot على المركبة (للـ PDF)
      await vehicleApi.update(vehicleId, {
        pricing: {
          ...pricingInput,
          quote,
          policyStartAt: policyStartAtIso,
          policyEndAt: policyEndAtIso,
          issuedAt: issuedAtIso,
        },
      });

      const policyNumber = `POL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const payRes = await paymentApi.create({
        vehicleId,
        policyNumber,
        amount: quote.total,
        paymentMethod: paymentMethod as any,
        paidBy: vehicleData.ownerName,
        payerPhone: vehicleData.phoneNumber,
        paymentStatus: "completed",

        pricingInput,
        breakdown: quote,

        policyStartAt: policyStartAtIso,
        policyEndAt: policyEndAtIso,
        issuedAt: issuedAtIso,
      });

      if (payRes?.success && payRes.data?._id) {
        const paymentId = payRes.data._id;
        setPaymentCompleted(true);
        setTimeout(() => navigate(`/pdf?payment=${paymentId}`), 800);
      } else {
        alert("فشل إنشاء سجل الدفع");
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "حدث خطأ في الدفع");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!vehicleData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (paymentCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-grey-800" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">تم الدفع بنجاح!</h2>
            <p className="text-gray-600 mb-4">تمت معالجة عملية الدفع بنجاح وسيتم توجيهك لصفحة إنشاء البوليصة</p>
            <div className="text-sm text-gray-500">جارٍ التوجيه خلال ثواني...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const premium = quote?.total ?? 0;

  const policyDurationLabel =
    vehicleData.policyDuration === "3months"
      ? "3 أشهر"
      : vehicleData.policyDuration === "6months"
      ? "6 أشهر"
      : vehicleData.policyDuration === "12months"
      ? "سنة كاملة"
      : vehicleData.policyDuration
      ? vehicleData.policyDuration
      : `${pricingInput ? (pricingInput as any).months : 12} شهر`;

  const coverageLabel =
    vehicleData.coverage === "third-party"
      ? "تأمين ضد الغير"
      : vehicleData.coverage === "comprehensive"
      ? "تأمين شامل"
      : vehicleData.coverage === "border-insurance"
      ? "تأمين حدود"
      : vehicleData.coverage || "-";

  const months = pricingInput ? Number((pricingInput as any).months || 12) : 12;
  const startAtObj = parseDatetimeLocal(policyStartAt) || new Date();
  const endAtObj = addMonthsSafe(startAtObj, months);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-grey-800" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-grey-800">منصة التأمين الإلزامي</h1>
                <p className="text-sm text-grey-800">إتمام عملية الدفع</p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="bg-primary-600 border-b border-primary-700 hover:bg-primary-700 transition-colors text-white"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            {/* Policy Summary */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  ملخص البوليصة
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary-600" />
                      <span className="font-medium">المؤمن له:</span>
                    </div>
                    <p className="text-lg">{vehicleData.ownerName}</p>
                    <p className="text-sm text-gray-600">الرقم الوطني/الجواز: {vehicleData.nationalId}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-primary-600" />
                      <span className="font-medium">المركبة:</span>
                    </div>
                    <p className="text-lg">
                      {vehicleData.brand} {vehicleData.model} {vehicleData.year}
                    </p>
                    <p className="text-sm text-gray-600">رقم اللوحة: {vehicleData.plateNumber}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-primary-700">مدة التأمين: </span>
                    <Badge variant="secondary">{policyDurationLabel}</Badge>
                  </div>
                  <div>
                    <span className="font-medium text-primary-700">نوع التغطية: </span>
                    <Badge variant={vehicleData.coverage === "comprehensive" ? "default" : "secondary"}>
                      {coverageLabel}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Inputs */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-6 h-6" />
                  حساب السعر
                </CardTitle>
                
              </CardHeader>

              <CardContent className="space-y-4">
                {pricingInput?.insuranceType === "internal" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>نوع المركبة (الكود)</Label>
                        <Select
  dir="rtl"
  value={pricingInput.vehicleCode || ""} // ✅ تأكيد أنها String
  onValueChange={(v) => {
    console.log("vehicleCode selected =>", v); // ✅ جرّب وشوف بالكونسول
    setPricingInput((prev) => {
      if (!prev || prev.insuranceType !== "internal") return prev;
      return { ...prev, vehicleCode: String(v) };
    });
  }}
>
  <SelectTrigger className="text-right">
    <SelectValue placeholder="اختر نوع المركبة" />
  </SelectTrigger>

  <SelectContent
    position="popper"
    sideOffset={6}
    className="z-[9999] max-h-72 overflow-y-auto pointer-events-auto"
  >
    {internalVehicleOptions
      .filter((o) => o.value && o.value.trim() !== "") // ✅ منع القيم الفارغة
      .map((o) => (
        <SelectItem key={o.value} value={String(o.value)}>
          {o.label} ({o.value})
        </SelectItem>
      ))}
  </SelectContent>
</Select>

                      </div>

                      <div className="space-y-2">
                        <Label>الفئة</Label>
                        <Select
                          value={pricingInput.category}
                          onValueChange={(v) =>
                            setPricingInput((prev) =>
                              prev && prev.insuranceType === "internal" ? { ...prev, category: v } : prev
                            )
                          }
                        >
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="اختر الفئة" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>التصنيف</Label>
                        <Select
                          value={pricingInput.classification}
                          onValueChange={(v) =>
                            setPricingInput((prev) =>
                              prev && prev.insuranceType === "internal" ? { ...prev, classification: v } : prev
                            )
                          }
                        >
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="اختر التصنيف" />
                          </SelectTrigger>
                          <SelectContent>
                            {classificationOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>المدة بالأشهر</Label>
                        <Select
                          value={String(pricingInput.months)}
                          onValueChange={(v) =>
                            setPricingInput((prev) =>
                              prev && prev.insuranceType === "internal" ? { ...prev, months: Number(v) } : prev
                            )
                          }
                        >
                          <SelectTrigger className="text-right">
                            <SelectValue placeholder="اختر المدة" />
                          </SelectTrigger>
                          <SelectContent>
                            {periodOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* الخدمات الإضافية */}
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg border">
                      <div className="font-semibold mb-3">الخدمات الإضافية</div>

                      <div className="space-y-3 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={pricingInput.electronicCard}
                            onChange={(e) =>
                              setPricingInput((prev) =>
                                prev && prev.insuranceType === "internal"
                                  ? { ...prev, electronicCard: e.target.checked }
                                  : prev
                              )
                            }
                          />
                          البطاقة الإلكترونية (+150 ل.س)
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={pricingInput.premiumService}
                            onChange={(e) =>
                              setPricingInput((prev) =>
                                prev && prev.insuranceType === "internal"
                                  ? { ...prev, premiumService: e.target.checked }
                                  : prev
                              )
                            }
                          />
                          خدمة العملاء المميزة (+50 ل.س)
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={pricingInput.rescueService}
                            onChange={(e) =>
                              setPricingInput((prev) =>
                                prev && prev.insuranceType === "internal"
                                  ? { ...prev, rescueService: e.target.checked }
                                  : prev
                              )
                            }
                          />
                          خدمة الإنقاذ (+30 ل.س)
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {pricingInput?.insuranceType === "border" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>نوع التأمين الحدودي</Label>
                      <Select
                        value={pricingInput.borderVehicleType}
                        onValueChange={(v) =>
                          setPricingInput((prev) =>
                            prev && prev.insuranceType === "border" ? { ...prev, borderVehicleType: v } : prev
                          )
                        }
                      >
                        <SelectTrigger className="text-right">
                          <SelectValue placeholder="اختر نوع التأمين الحدودي" />
                        </SelectTrigger>
                        <SelectContent>
                          {borderTypeOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>المدة بالأشهر</Label>
                      <Select
                        value={String(pricingInput.months)}
                        onValueChange={(v) =>
                          setPricingInput((prev) =>
                            prev && prev.insuranceType === "border" ? { ...prev, months: Number(v) } : prev
                          )
                        }
                      >
                        <SelectTrigger className="text-right">
                          <SelectValue placeholder="اختر المدة" />
                        </SelectTrigger>
                        <SelectContent>
                          {periodOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {quoteLoading && (
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    جارٍ حساب السعر من الباك...
                  </div>
                )}

                {quoteError && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-right">{quoteError}</AlertDescription>
                  </Alert>
                )}

                {!quoteLoading && !quoteError && !quote && (
                  <Alert>
                    <AlertDescription className="text-right">اختر بيانات التسعير أعلاه ليتم حساب السعر.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* تاريخ ووقت البوليصة */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-6 h-6" />
                  تاريخ ووقت البوليصة
                </CardTitle>
                <CardDescription>اختر تاريخ/وقت بدء البوليصة (قد يختلف عن وقت إنشاء الدفع)</CardDescription>
              </CardHeader>

              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>تاريخ/وقت البداية</Label>
                  <Input type="datetime-local" value={policyStartAt} onChange={(e) => setPolicyStartAt(e.target.value)} />
                  <p className="text-xs text-gray-500">المعروض في PDF كبداية صلاحية البوليصة</p>
                </div>

                <div className="space-y-2">
                  <Label>تاريخ/وقت الانتهاء (محسوب)</Label>
                  <Input type="text" value={formatDateTime(endAtObj)} disabled />
                  <p className="text-xs text-gray-500">يُحسب تلقائياً حسب مدة التأمين المختارة</p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-6 h-6" />
                  طريقة الدفع
                </CardTitle>
                <CardDescription>اختر طريقة الدفع المناسبة</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">طريقة الدفع *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="اختر طريقة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">دفع نقدي</SelectItem>
                      <SelectItem value="bank-transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="card">بطاقة ائتمانية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === "card" && (
                  <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">رقم البطاقة</Label>
                        <Input id="cardNumber" placeholder="1234 5678 9012 3456" className="text-left" dir="ltr" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expiryDate">تاريخ الانتهاء</Label>
                        <Input id="expiryDate" placeholder="MM/YY" className="text-left" dir="ltr" />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === "bank-transfer" && (
                  <Alert>
                    <AlertDescription className="text-right">
                      <strong>معلومات التحويل البنكي:</strong>
                      <br />
                      البنك: البنك التجاري السوري
                      <br />
                      رقم الحساب: 123456789
                      <br />
                      الرقم المرجعي: {vehicleData.plateNumber}-{Date.now()}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right */}
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-6 h-6" />
                  ملخص المبلغ
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {quote ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>البدل الصافي:</span>
                      {moneySpan(formatCurrency(quote.netPremium))}
                    </div>
                    <div className="flex justify-between">
                      <span>رسم الطابع:</span>
                      {moneySpan(formatCurrency(quote.stampFee))}
                    </div>
                    <div className="flex justify-between">
                      <span>المجهود الحربي:</span>
                      {moneySpan(formatCurrency(quote.warEffort))}
                    </div>
                    <div className="flex justify-between">
                      <span>الإدارة المحلية:</span>
                      {moneySpan(formatCurrency(quote.localAdmin))}
                    </div>
                    <div className="flex justify-between">
                      <span>طابع الشهيد:</span>
                      {moneySpan(formatCurrency(quote.martyrStamp))}
                    </div>
                    <div className="flex justify-between">
                      <span>رسم الإعمار:</span>
                      {moneySpan(formatCurrency(quote.reconstruction))}
                    </div>

                    {(quote.electronicCardFee > 0 || quote.premiumServiceFee > 0 || quote.rescueServiceFee > 0) && (
                      <>
                        <Separator />
                        {quote.electronicCardFee > 0 && (
                          <div className="flex justify-between">
                            <span>البطاقة الإلكترونية:</span>
                            {moneySpan(formatCurrency(quote.electronicCardFee))}
                          </div>
                        )}
                        {quote.premiumServiceFee > 0 && (
                          <div className="flex justify-between">
                            <span>خدمة العملاء المميزة:</span>
                            {moneySpan(formatCurrency(quote.premiumServiceFee))}
                          </div>
                        )}
                        {quote.rescueServiceFee > 0 && (
                          <div className="flex justify-between">
                            <span>خدمة الإنقاذ:</span>
                            {moneySpan(formatCurrency(quote.rescueServiceFee))}
                          </div>
                        )}
                      </>
                    )}

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>المبلغ الإجمالي:</span>
                      <span className="text-primary">{moneySpan(formatCurrency(premium))}</span>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription className="text-right">
                      لا يوجد سعر محسوب حالياً. الرجاء اختيار بيانات التسعير.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handlePayment}
                  disabled={!paymentMethod || isProcessing || !quote}
                  className="w-full h-12 text-lg"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جارٍ المعالجة...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      تأكيد الدفع
                    </div>
                  )}
                </Button>

                <div className="text-xs text-center text-gray-500 mt-4">جميع المعاملات آمنة ومشفرة</div>
              </CardContent>
            </Card>

            {/* Policy Validity */}
            <Card className="bg-primary-50 border-primary-200">
              <CardHeader>
                <CardTitle className="text-primary-800 text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  صلاحية البوليصة
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>تاريخ/وقت البداية:</span>
                    <span dir="ltr" className="whitespace-nowrap tabular-nums">
                      {formatDateTime(startAtObj)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>تاريخ/وقت الانتهاء:</span>
                    <span dir="ltr" className="whitespace-nowrap tabular-nums">
                      {formatDateTime(endAtObj)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
