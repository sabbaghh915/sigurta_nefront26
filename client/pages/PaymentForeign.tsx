// src/pages/PaymentForeign.tsx
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

import { PERIODS_MONTHS, BORDER_VEHICLE_TYPES } from "../constants/insuranceOptions";

type PricingInputBorder = {
  insuranceType: "border";
  borderVehicleType: string;
  months: number;
};

type QuoteBreakdown = {
  netPremium: number;
  stampFee: number;
  warEffort: number;
  martyrFund: number;
  localAdministration: number;
  reconstruction: number;
  total: number;
};

type ForeignVehicleDataView = {
  ownerName: string;
  passportNumber?: string; // من صفحة الإدخال
  nationalId?: string; // fallback
  phoneNumber: string;
  address?: string;

  plateNumber: string;
  plateCountry?: string;

  brand: string;
  model: string;
  year: string;

  coverage?: string; // غالباً border-insurance
  policyDuration?: string; // للعرض
  vehicleId?: string;

  nationality?: string;
};

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ar-SY", {
    style: "currency",
    currency: "SYP",
    minimumFractionDigits: 0,
  }).format(Math.round(amount));
}

function durationFromMonths(months: number) {
  if (months === 1) return "1months";
  if (months === 2) return "2months";
  if (months === 3) return "3months";
  if (months === 6) return "6months";
  return "12months";
}

export default function PaymentForeign() {
  const navigate = useNavigate();

  const [vehicleData, setVehicleData] = useState<ForeignVehicleDataView | null>(null);

  const [paymentMethod, setPaymentMethod] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const [pricingInput, setPricingInput] = useState<PricingInputBorder | null>(null);
  const [quote, setQuote] = useState<QuoteBreakdown | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const periodOptions = useMemo(
    () =>
      (PERIODS_MONTHS as unknown as any[])?.map((o) => ({
        value: String(o.value ?? o.months ?? o.id ?? ""),
        label: String(o.label ?? o.name ?? o.title ?? o.value ?? ""),
      })) ?? [],
    []
  );

  const borderTypeOptions = useMemo(
    () =>
      (BORDER_VEHICLE_TYPES as unknown as any[])?.map((o) => ({
        value: String(o.value ?? o.code ?? o.id ?? ""),
        label: String(o.label ?? o.name ?? o.title ?? o.value ?? ""),
      })) ?? [],
    []
  );

  // 1) اقرأ بيانات الأجنبية من localStorage
  useEffect(() => {
    const foreignRaw = localStorage.getItem("foreignVehicleData");
    if (!foreignRaw) {
      navigate("/");
      return;
    }

    const data = JSON.parse(foreignRaw);

    setVehicleData({
      ownerName: data.ownerName ?? "",
      passportNumber: data.passportNumber ?? "",
      nationalId: data.nationalId ?? "",
      phoneNumber: data.phoneNumber ?? "",
      address: data.address ?? "",

      plateNumber: data.plateNumber ?? "",
      plateCountry: data.plateCountry ?? data.country ?? "",

      brand: data.brand ?? "",
      model: data.model ?? "",
      year: String(data.year ?? ""),

      coverage: data.coverage ?? "border-insurance",
      policyDuration: data.policyDuration ?? "",
      vehicleId: data.vehicleId,

      nationality: data.nationality ?? "",
    });

    setPricingInput({
      insuranceType: "border",
      borderVehicleType: data.borderVehicleType ?? "",
      months: Number(data.insuranceMonths ?? data.months ?? 3),
    });
  }, [navigate]);

  // 2) حساب السعر من الباك
  useEffect(() => {
    const run = async () => {
      if (!pricingInput) return;

      if (!pricingInput.borderVehicleType || !pricingInput.months) {
        setQuote(null);
        return;
      }

      try {
        setQuoteLoading(true);
        setQuoteError(null);

        const token = localStorage.getItem("authToken");
        const res = await fetch("/api/insurance/calculate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(pricingInput),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);

        const payload = json?.data ?? json;
        const breakdown = payload?.breakdown ?? payload;

        setQuote({
          netPremium: safeNum(breakdown?.netPremium),
          stampFee: safeNum(breakdown?.stampFee),
          warEffort: safeNum(breakdown?.warEffort ?? breakdown?.warFee),
          martyrFund: safeNum(breakdown?.martyrFund ?? breakdown?.martyrFee),
          localAdministration: safeNum(breakdown?.localAdministration ?? breakdown?.localFee),
          reconstruction: safeNum(breakdown?.reconstruction ?? breakdown?.reconFee),
          total: safeNum(payload?.total ?? breakdown?.total),
        });
      } catch (e: any) {
        setQuote(null);
        setQuoteError(e?.message || "فشل حساب التأمين");
      } finally {
        setQuoteLoading(false);
      }
    };

    run();
  }, [pricingInput]);

  const handlePayment = async () => {
    if (!vehicleData || !paymentMethod) return;

    if (!quote || !pricingInput) {
      alert("احسب السعر أولاً من بيانات التسعير");
      return;
    }

    const vehicleId = vehicleData.vehicleId;
    if (!vehicleId || typeof vehicleId !== "string") {
      alert("خطأ: لم يتم العثور على vehicleId (تأكد من حفظ السيارة الأجنبية أولاً في الداتا بيز)");
      return;
    }

    setIsProcessing(true);

    try {
      const { vehicleApi, paymentApi } = await import("../services/api");

      // ✅ 1) تخزين التسعير داخل Vehicle
      await vehicleApi.update(vehicleId, {
        vehicleType: "foreign" as any,
        coverage: "border-insurance",
        policyDuration: durationFromMonths(pricingInput.months),
        pricing: {
          ...pricingInput,
          quote,
        },
      } as any);

      // ✅ 2) إنشاء الدفع + تخزين Snapshot داخل Payment
      const policyNumber = `BORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const payRes = await paymentApi.create({
        vehicleId,
        policyNumber,
        amount: quote.total,
        paymentMethod: paymentMethod as any,
        paidBy: vehicleData.ownerName,
        payerPhone: vehicleData.phoneNumber,
        paymentStatus: "completed",
        receiptNumber: "",

        // مهم لتخزين كل شيء داخل Payment (بعد تعديل الباك)
        pricingInput,
        quote,
      } as any);

      if (payRes?.success && payRes.data?._id) {
        const paymentId = payRes.data._id;
        setPaymentCompleted(true);

        // اختياري: حفظ آخر دفع محلياً
        localStorage.setItem("paymentData", JSON.stringify(payRes.data));

        setTimeout(() => {
          navigate(`/pdf-foreign?payment=${paymentId}`);
        }, 800);
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
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (paymentCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">تم الدفع بنجاح!</h2>
            <p className="text-gray-600 mb-4">سيتم توجيهك لصفحة إصدار PDF للتأمين الحدودي</p>
            <div className="text-sm text-gray-500">جارٍ التوجيه...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const premium = quote?.total ?? 0;
  const passportOrId = vehicleData.passportNumber || vehicleData.nationalId || "-";

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-syrian-red rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-grey-800" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-grey-800">منصة التأمين الإلزامي</h1>
                <p className="text-sm text-grey-800">دفع التأمين الحدودي (سيارات أجنبية)</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate(-1)} className="bg-orange-500
    text-white
    border
    border-syrian-red
    hover:bg-syrian-red">
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
            {/* Summary */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  ملخص التأمين الحدودي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-red-600" />
                      <span className="font-medium">المالك:</span>
                    </div>
                    <p className="text-lg">{vehicleData.ownerName}</p>
                    <p className="text-sm text-gray-600">جواز/هوية: {passportOrId}</p>
                    {vehicleData.nationality ? <p className="text-sm text-gray-600">الجنسية: {vehicleData.nationality}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-red-600" />
                      <span className="font-medium">المركبة:</span>
                    </div>
                    <p className="text-lg">
                      {vehicleData.brand} {vehicleData.model} {vehicleData.year}
                    </p>
                    <p className="text-sm text-gray-600">
                      اللوحة: {vehicleData.plateNumber} {vehicleData.plateCountry ? `(${vehicleData.plateCountry})` : ""}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-red-700">نوع التغطية: </span>
                    <Badge variant="secondary">تأمين حدودي</Badge>
                  </div>
                  <div>
                    <span className="font-medium text-red-700">المبلغ الإجمالي: </span>
                    <Badge>{formatCurrency(premium)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing inputs (border only) */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-6 h-6" />
                  بيانات التسعير (حدودي)
                </CardTitle>
                <CardDescription>هذه البيانات تُرسل للباك ليحسب سعر التأمين الحدودي</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نوع التأمين الحدودي</Label>
                    <Select
                      value={pricingInput?.borderVehicleType || ""}
                      onValueChange={(v) => setPricingInput((prev) => (prev ? { ...prev, borderVehicleType: v } : prev))}
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
                      value={String(pricingInput?.months || 0)}
                      onValueChange={(v) => setPricingInput((prev) => (prev ? { ...prev, months: Number(v) } : prev))}
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

                {quoteLoading && (
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
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
                    <AlertDescription className="text-right">اختر نوع التأمين الحدودي + المدة ليتم حساب السعر.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Payment method */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-6 h-6" />
                  طريقة الدفع
                </CardTitle>
                <CardDescription>اختر طريقة الدفع</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>طريقة الدفع *</Label>
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
                        <Label>رقم البطاقة</Label>
                        <Input placeholder="1234 5678 9012 3456" className="text-left" dir="ltr" />
                      </div>
                      <div className="space-y-2">
                        <Label>تاريخ الانتهاء</Label>
                        <Input placeholder="MM/YY" className="text-left" dir="ltr" />
                      </div>
                    </div>
                  </div>
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
                      <span>{formatCurrency(quote.netPremium)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>رسم الطابع:</span>
                      <span>{formatCurrency(quote.stampFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>المجهود الحربي:</span>
                      <span>{formatCurrency(quote.warEffort)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>طابع الشهيد:</span>
                      <span>{formatCurrency(quote.martyrFund)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الإدارة المحلية:</span>
                      <span>{formatCurrency(quote.localAdministration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>إعادة الإعمار:</span>
                      <span>{formatCurrency(quote.reconstruction)}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>المبلغ الإجمالي:</span>
                      <span className="text-red">{formatCurrency(quote.total)}</span>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription className="text-right">لا يوجد سعر محسوب حالياً.</AlertDescription>
                  </Alert>
                )}

                <Button onClick={handlePayment} disabled={!paymentMethod || isProcessing || !quote} className="w-full h-12 text-lg">
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

            <Card className="bg-red-50 border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800 text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  صلاحية التأمين الحدودي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>تاريخ البداية:</span>
                    <span>{new Date().toLocaleDateString("ar-SY")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>تاريخ الانتهاء:</span>
                    <span>
                      {(() => {
                        const endDate = new Date();
                        endDate.setMonth(endDate.getMonth() + Number(pricingInput?.months || 3));
                        return endDate.toLocaleDateString("ar-SY");
                      })()}
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
