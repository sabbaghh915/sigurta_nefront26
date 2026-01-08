// src/pages/PdfForeign.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Car, Download, Printer, ArrowLeft, FileText, Calendar, User, Shield, CheckCircle, Home } from "lucide-react";

type QuoteBreakdown = {
  netPremium: number;
  stampFee: number;
  warEffort: number;
  martyrFund: number;
  localAdministration: number;
  reconstruction: number;
  total: number;
};

type VehicleFromDb = {
  _id: string;
  vehicleType: "foreign";
  ownerName: string;
  nationalId: string;
  passportNumber?: string;
  nationality?: string;
  phoneNumber: string;
  address?: string;

  plateNumber: string;
  plateCountry?: string;

  chassisNumber: string;
  brand: string;
  model: string;
  year: number;
  color?: string;

  policyDuration?: string;
  coverage?: string;
  notes?: string;

  pricing?: {
    insuranceType: "border";
    months?: number;
    borderVehicleType?: string;
    quote?: QuoteBreakdown;
  };

  entryDate?: string;
  exitDate?: string;
  entryPoint?: string;
};

type PaymentFromDb = {
  _id: string;
  vehicleId: string | { _id: string };
  policyNumber: string;
  amount: number;
  paymentDate?: string;
  createdAt?: string;

  // إذا خزّنت snapshot داخل Payment
  pricingInput?: any;
  quote?: QuoteBreakdown;
};

function isObjectIdLike(v?: string | null) {
  return !!v && /^[a-f\d]{24}$/i.test(v);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("ar-SY");
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ar-SY", {
    style: "currency",
    currency: "SYP",
    minimumFractionDigits: 0,
  }).format(amount);
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getDurationLabel(duration?: string) {
  const d = (duration || "").toLowerCase();
  if (d.includes("1") && d.includes("month")) return "شهر";
  if (d.includes("2")) return "شهرين";
  if (d.includes("3")) return "3 أشهر";
  if (d.includes("6")) return "6 أشهر";
  if (d.includes("12") || d.includes("year")) return "سنة كاملة";
  return duration || "-";
}

export default function PdfForeign() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<{
    payment: PaymentFromDb;
    vehicle: VehicleFromDb;
    premium: number;
    issueDate: string;
    startDate: string;
    endDate: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("authToken");

        const apiFetch = async (url: string) => {
          const res = await fetch(url, {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
          const json = await res.json().catch(() => null);
          if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
          return json?.data ?? json;
        };

        const paymentIdParam = searchParams.get("payment") || searchParams.get("paymentId");
        const paymentId = isObjectIdLike(paymentIdParam) ? paymentIdParam : null;

        if (!paymentId) throw new Error("paymentId غير صحيح");

        const payment: PaymentFromDb = await apiFetch(`/api/payments/${paymentId}`);

        const vehicleId =
          typeof payment.vehicleId === "string" ? payment.vehicleId : payment.vehicleId?._id;

        if (!vehicleId) throw new Error("لم يتم العثور على vehicleId داخل payment");

        const vehicle: VehicleFromDb = await apiFetch(`/api/vehicles/${vehicleId}`);

        const premium = Number(payment.amount) || 0;

        const issueDateObj = payment.paymentDate
          ? new Date(payment.paymentDate)
          : payment.createdAt
          ? new Date(payment.createdAt)
          : new Date();

        const months = Number(vehicle?.pricing?.months) || Number(payment?.pricingInput?.months) || 3;

        const start = issueDateObj;
        const end = addMonths(issueDateObj, months);

        setData({
          payment,
          vehicle,
          premium,
          issueDate: issueDateObj.toISOString().split("T")[0],
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
        });
      } catch (e) {
        console.error(e);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [navigate, searchParams]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 1000));
    alert("سيتم تطوير تحميل PDF قريباً");
    setIsGenerating(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جارٍ تحميل بيانات PDF...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center p-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">لم يتم العثور على البيانات</h2>
            <p className="text-gray-600 mb-4">لا توجد بيانات دفع/مركبة لهذا الطلب</p>
            <Button onClick={() => navigate("/")}>العودة</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { payment, vehicle, premium, issueDate, startDate, endDate } = data;
  const passport = vehicle.passportNumber || vehicle.nationalId;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-white shadow-sm border-b border-gray-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-700 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-grey-800" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-grey-800">منصة التأمين الإلزامي</h1>
                <p className="text-sm text-grey-800">PDF التأمين الحدودي</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handlePrint} className="bg-primary-600
    border-b
    border-primary-700
    hover:bg-primary-700
    transition-colors
    text-white">
                <Printer className="w-4 h-4 ml-2" />
                طباعة
              </Button>
              <Button onClick={handleDownloadPdf} disabled={isGenerating} className="bg-primary-600
    border-b
    border-primary-700
    hover:bg-primary-700
    transition-colors
    text-white">
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin ml-2" />
                ) : (
                  <Download className="w-4 h-4 ml-2" />
                )}
                {isGenerating ? "جارٍ..." : "تحميل PDF"}
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="bg-primary-600
    border-b
    border-primary-700
    hover:bg-primary-700
    transition-colors
    text-white">
                <Home className="w-4 h-4 ml-2" />
                الرئيسية
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)} className="bg-primary-600
    border-b
    border-primary-700
    hover:bg-primary-700
    transition-colors
    text-white">
                <ArrowLeft className="w-4 h-4 ml-2" />
                العودة
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 print:p-0">
        <Alert className="mb-6 bg-success-50 border-success-200 print:hidden">
          <CheckCircle className="w-5 h-5 text-success" />
          <AlertDescription className="text-success-800 text-right">
            <strong>تم إصدار تأمين حدودي بنجاح!</strong> يمكنك طباعة المستند أو تحميله.
          </AlertDescription>
        </Alert>

        <div ref={printRef}>
          <Card className="shadow-xl print:shadow-none print:border-0">
            <CardHeader className="text-center bg-primary text-white print:bg-white print:text-black border-b-4 border-red-600">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Shield className="w-12 h-12" />
                <div>
                  <CardTitle className="text-2xl font-bold">بوليصة التأمين الحدودي للمركبات الأجنبية</CardTitle>
                  <p className="text-lg opacity-90 print:text-gray-600">الجمهورية العربية السورية</p>
                </div>
              </div>

              <div className="bg-white/10 print:bg-gray-100 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm opacity-80 print:text-gray-600">رقم البوليصة</p>
                    <p className="text-xl font-bold">{payment.policyNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80 print:text-gray-600">تاريخ الإصدار</p>
                    <p className="text-xl font-bold">{formatDate(issueDate)}</p>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8 space-y-8">
              <div className="bg-primary-50 print:bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-primary-800 print:text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  فترة الصلاحية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-primary-600 print:text-gray-600">تاريخ البداية</p>
                    <p className="text-xl font-bold">{formatDate(startDate)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-primary-600 print:text-gray-600">تاريخ الانتهاء</p>
                    <p className="text-xl font-bold text-destructive">{formatDate(endDate)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-primary-600 print:text-gray-600">مدة التأمين</p>
                    <Badge className="text-lg px-4 py-2">{getDurationLabel(vehicle.policyDuration)}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  بيانات المؤمن له
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">الاسم الكامل</p>
                    <p className="text-lg font-medium">{vehicle.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">جواز السفر</p>
                    <p className="text-lg font-medium font-mono">{passport}</p>
                  </div>
                  {vehicle.nationality ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">الجنسية</p>
                      <p className="text-lg font-medium">{vehicle.nationality}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-sm text-gray-600 mb-1">رقم الهاتف</p>
                    <p className="text-lg font-medium font-mono">{vehicle.phoneNumber}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  بيانات المركبة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">رقم اللوحة</p>
                    <p className="text-xl font-bold font-mono bg-white px-3 py-2 rounded border-2">
                      {vehicle.plateNumber} {vehicle.plateCountry ? `(${vehicle.plateCountry})` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">رقم الهيكل (VIN)</p>
                    <p className="text-lg font-medium font-mono">{vehicle.chassisNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">الماركة والموديل</p>
                    <p className="text-lg font-medium">
                      {vehicle.brand} {vehicle.model}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">سنة الصنع</p>
                    <p className="text-lg font-medium">{vehicle.year}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  تفاصيل القسط
                </h3>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">نوع التغطية</p>
                      <Badge className="text-lg px-4 py-2">تأمين حدودي</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">قيمة القسط الإجمالي</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(premium)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="text-sm text-gray-600 space-y-2">
                <h4 className="font-bold text-gray-800">الشروط والأحكام:</h4>
                <ul className="list-disc list-inside space-y-1 mr-4">
                  <li>هذه البوليصة صالحة ضمن فترة التأمين المحددة فقط</li>
                  <li>يجب إبراز المستند عند الطلب ضمن المعابر والجهات المعنية</li>
                  <li>تسري أحكام التأمين الإلزامي والحدودي وفق الأنظمة السورية</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
