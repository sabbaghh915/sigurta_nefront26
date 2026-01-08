import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle,
  Download,
  FileText,
  Home,
  Printer,
  Shield,
  User,
} from "lucide-react";

// ✅ PDF + QR
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";

type QuoteBreakdown = {
  netPremium: number;
  stampFee: number;
  warEffort: number;
  martyrFund: number;
  localAdministration: number;
  reconstruction: number;

  agesFee?: number;
  federationFee?: number;

  electronicCardFee?: number;
  premiumServiceFee?: number;
  rescueServiceFee?: number;

  subtotal?: number;
  total: number;

  // ✅ (اختياري) flags لو كانت ترجع ضمن breakdown
  electronicCard?: boolean;
  premiumService?: boolean;
  rescueService?: boolean;
};

interface PolicyData {
  policyNumber: string;

  ownerName: string;
  nationalId: string;
  phoneNumber: string;
  address: string;

  plateNumber: string;
  chassisNumber: string;
  brand: string;
  model: string;
  year: string;
  color?: string;

  policyDuration: string;
  coverage: string;

  premium: number;
  breakdown?: QuoteBreakdown;

  // ✅ تواريخ/أوقات (نستخدم ISO كامل، ونطبع كـ date+time)
  issueAt: string; // وقت الإصدار
  startAt: string; // بداية صلاحية البوليصة
  endAt: string;   // نهاية صلاحية البوليصة

  issuedByEmployee?: string;
  issuedByCenter?: string;
  issuedByCenterIp?: string;

  // ✅ الخدمات الإضافية
  services?: {
    electronicCard: boolean;
    premiumService: boolean;
    rescueService: boolean;
  };

  notes?: string;
}

type VehicleFromDb = {
  _id: string;
  vehicleType: "syrian" | "foreign";
  ownerName: string;
  nationalId: string;
  phoneNumber: string;
  address: string;

  plateNumber: string;
  chassisNumber: string;
  brand: string;
  model: string;
  year: number;
  color?: string;

  coverage?: string;
  policyDuration?: string;
  notes?: string;

  pricing?: {
    insuranceType?: "internal" | "border";
    months?: number;
    quote?: Partial<QuoteBreakdown>;
    // أحياناً التخزين يكون ضمن pricingInput
    electronicCard?: boolean;
    premiumService?: boolean;
    rescueService?: boolean;
  };
};

type PaymentFromDb = {
  _id: string;
  vehicleId: any;
  policyNumber: string;
  amount: number;

  pricingInput?: any;
  breakdown?: Partial<QuoteBreakdown>;

  issuedAt?: string;
  policyStartAt?: string;
  policyEndAt?: string;

  paymentDate?: string;
  createdAt?: string;
};

function isObjectIdLike(v?: string | null) {
  return !!v && /^[a-f\d]{24}$/i.test(v);
}

function extractId(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (typeof v._id === "string") return v._id;
    if (typeof v.id === "string") return v.id;
  }
  return null;
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatDateTime(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleString("ar-SY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ar-SY", {
    style: "currency",
    currency: "SYP",
    minimumFractionDigits: 0,
  }).format(Math.round(amount));
}

function getCoverageLabel(coverage: string) {
  if (coverage === "third-party") return "تأمين ضد الغير";
  if (coverage === "comprehensive") return "تأمين شامل";
  if (coverage === "border-insurance") return "تأمين حدودي";
  return coverage || "-";
}

function getDurationLabel(duration: string) {
  switch (duration) {
    case "1months":
    case "1month":
      return "شهر";
    case "2months":
      return "شهرين";
    case "3months":
      return "3 أشهر";
    case "6months":
      return "6 أشهر";
    case "12months":
    case "12month":
      return "سنة كاملة";
    default:
      return duration || "-";
  }
}

function durationFromMonths(months?: number) {
  if (!months) return "12months";
  if (months === 1) return "1months";
  if (months === 2) return "2months";
  if (months === 3) return "3months";
  if (months === 6) return "6months";
  return "12months";
}

function parseMonthsFromPolicyDuration(d?: string) {
  const s = String(d || "").toLowerCase();
  if (s.includes("12")) return 12;
  if (s.includes("6")) return 6;
  if (s.includes("3")) return 3;
  if (s.includes("2")) return 2;
  if (s.includes("1")) return 1;
  return 12;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Number(months || 0));
  return d;
}

export default function PdfGeneration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [policyData, setPolicyData] = useState<PolicyData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ QR DataURL
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const printRef = useRef<HTMLDivElement>(null);

  const userLocal = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const employeeName =
    userLocal?.fullName || localStorage.getItem("employeeName") || "";
  const centerName =
    userLocal?.center?.name || localStorage.getItem("centerName") || "";
  const centerIp =
    userLocal?.center?.ip || localStorage.getItem("centerIp") || "";

  // ✅ رابط/قيمة الـ QR (يفضل يكون صفحة تحقق عامة)
  const qrValue = useMemo(() => {
    if (!policyData?.policyNumber) return "";
    const publicBase =
      (import.meta as any)?.env?.VITE_PUBLIC_URL || window.location.origin;

    // مثال: https://your-site.com/verify?policy=POL-...
    return `${publicBase}/verify?policy=${encodeURIComponent(
      policyData.policyNumber
    )}`;
  }, [policyData?.policyNumber]);

  // ✅ توليد QR كصورة base64 (DataURL)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!qrValue) return;
        const url = await QRCode.toDataURL(qrValue, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 256,
        });
        if (!cancelled) setQrDataUrl(url);
      } catch (e) {
        console.error("QR generation failed:", e);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [qrValue]);

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

        const paymentIdParam =
          searchParams.get("paymentId") ||
          searchParams.get("payment") ||
          searchParams.get("policy");

        const paymentLocal = (() => {
          try {
            return JSON.parse(localStorage.getItem("paymentData") || "null");
          } catch {
            return null;
          }
        })();

        let payment: PaymentFromDb | null = null;

        const candidatePaymentId =
          (isObjectIdLike(paymentIdParam) ? paymentIdParam : null) ||
          (isObjectIdLike(paymentLocal?._id) ? paymentLocal._id : null);

        if (candidatePaymentId) {
          // ✅ مهم: populate=1 حتى يرجع vehicle/center/company
          payment = await apiFetch(`/api/payments/${candidatePaymentId}?populate=1`);
        } else if (paymentIdParam) {
          const list = await apiFetch(
            `/api/payments?search=${encodeURIComponent(paymentIdParam)}`
          );
          payment = Array.isArray(list) ? list[0] : list?.data?.[0] || null;
        }

        const vehicleLocal = (() => {
          try {
            return JSON.parse(localStorage.getItem("vehicleData") || "null");
          } catch {
            return null;
          }
        })();

        const vehicleIdParam = searchParams.get("vehicleId");
        const vehicleId =
          extractId(payment?.vehicleId) ||
          (typeof vehicleIdParam === "string" ? vehicleIdParam : null) ||
          (typeof vehicleLocal?.vehicleId === "string" ? vehicleLocal.vehicleId : null);

        if (!vehicleId || !isObjectIdLike(vehicleId)) {
          throw new Error(
            `لم يتم العثور على vehicleId صالح. received: ${String(vehicleId)}`
          );
        }

        const vehicle: VehicleFromDb = await apiFetch(`/api/vehicles/${vehicleId}`);

        // ✅ احسن مصدر: payment.breakdown ثم vehicle.pricing.quote
        const pBreak = (payment?.breakdown ?? vehicle?.pricing?.quote ?? {}) as any;

        // ✅ احسن مصدر للخدمات: payment.pricingInput ثم vehicle.pricing
        const pInput = (payment?.pricingInput ?? vehicle?.pricing ?? {}) as any;

        const services = {
          electronicCard: Boolean(pInput?.electronicCard),
          premiumService: Boolean(pInput?.premiumService),
          rescueService: Boolean(pInput?.rescueService),
        };

        const breakdown: QuoteBreakdown | undefined =
          pBreak && (Object.keys(pBreak).length > 0)
            ? {
                netPremium: safeNum(pBreak?.netPremium),
                stampFee: safeNum(pBreak?.stampFee),
                warEffort: safeNum(pBreak?.warEffort),
                martyrFund: safeNum(pBreak?.martyrFund),
                localAdministration: safeNum(pBreak?.localAdministration),
                reconstruction: safeNum(pBreak?.reconstruction),

                agesFee: safeNum(pBreak?.agesFee),
                federationFee: safeNum(pBreak?.federationFee),

                electronicCardFee: safeNum(pBreak?.electronicCardFee),
                premiumServiceFee: safeNum(pBreak?.premiumServiceFee),
                rescueServiceFee: safeNum(pBreak?.rescueServiceFee),

                subtotal: safeNum(pBreak?.subtotal),
                total: safeNum(pBreak?.total),
              }
            : undefined;

        const premium =
          safeNum(payment?.amount) ||
          safeNum(paymentLocal?.amount) ||
          safeNum(breakdown?.total) ||
          safeNum(vehicle?.pricing?.quote?.total) ||
          0;

        const months =
          safeNum(pInput?.months) ||
          safeNum(vehicle?.pricing?.months) ||
          parseMonthsFromPolicyDuration(vehicle?.policyDuration) ||
          12;

        // ✅ تواريخ/أوقات من Payment (الأهم)
        const issueDateObj =
          payment?.issuedAt
            ? new Date(payment.issuedAt)
            : payment?.paymentDate
            ? new Date(payment.paymentDate)
            : payment?.createdAt
            ? new Date(payment.createdAt)
            : new Date();

        const startDateObj = payment?.policyStartAt
          ? new Date(payment.policyStartAt)
          : issueDateObj;

        const endDateObj = payment?.policyEndAt
          ? new Date(payment.policyEndAt)
          : addMonths(startDateObj, months);

        const newPolicy: PolicyData = {
          policyNumber:
            payment?.policyNumber ||
            paymentLocal?.policyNumber ||
            `POL-${new Date().getFullYear()}-${Math.random().toString().slice(2, 8)}`,

          ownerName: vehicle.ownerName,
          nationalId: vehicle.nationalId,
          phoneNumber: vehicle.phoneNumber,
          address: vehicle.address,

          plateNumber: vehicle.plateNumber,
          chassisNumber: vehicle.chassisNumber,
          brand: vehicle.brand,
          model: vehicle.model,
          year: String(vehicle.year),
          color: vehicle.color,

          policyDuration: vehicle.policyDuration || durationFromMonths(months),
          coverage:
            vehicle.coverage ||
            (vehicle.vehicleType === "foreign" ? "border-insurance" : "third-party"),

          premium,
          breakdown: breakdown
            ? {
                ...breakdown,
                // ✅ نضمن أن flags تتطابق مع اختيار الخدمات
                electronicCard: services.electronicCard,
                premiumService: services.premiumService,
                rescueService: services.rescueService,
                // ✅ fallback total
                total: safeNum(breakdown.total) || premium,
              }
            : undefined,

          issueAt: issueDateObj.toISOString(),
          startAt: startDateObj.toISOString(),
          endAt: endDateObj.toISOString(),

          issuedByEmployee: employeeName,
          issuedByCenter: centerName,
          issuedByCenterIp: centerIp,

          services,
          notes: vehicle.notes,
        };

        setPolicyData(newPolicy);
      } catch (e) {
        console.error("Error loading policy data:", e);
        setPolicyData(null);
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

  // ✅ تحميل PDF فعلي + فيه QR بمكان الختم
  const handleDownloadPdf = async () => {
    if (!printRef.current || !policyData) return;

    setIsGenerating(true);
    try {
      if (!qrDataUrl && qrValue) {
        const url = await QRCode.toDataURL(qrValue, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 256,
        });
        setQrDataUrl(url);
      }

      await new Promise((r) => setTimeout(r, 150));

      const element = printRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= usableHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= usableHeight;
      }

      pdf.save(`policy-${policyData.policyNumber}.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert("فشل إنشاء PDF. افتح الكونسول لمعرفة السبب.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جارٍ تحميل بيانات البوليصة...</p>
        </div>
      </div>
    );
  }

  if (!policyData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center p-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              لم يتم العثور على البوليصة
            </h2>
            <p className="text-gray-600 mb-4">لا توجد بيانات للبوليصة المطلوبة</p>
            <Button onClick={() => navigate("/")}>العودة للصفحة الرئيسية</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showServices =
    !!policyData.services &&
    (policyData.services.electronicCard ||
      policyData.services.premiumService ||
      policyData.services.rescueService);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-syrian-red rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-grey-800">منصة التأمين الإلزامي</h1>
                <p className="text-sm text-grey-800">إصدار البوليصة</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="bg-orange-500 text-white border border-syrian-red hover:bg-syrian-red"
              >
                <Printer className="w-4 h-4" />
                طباعة
              </Button>

              <Button
                onClick={handleDownloadPdf}
                disabled={isGenerating}
                className="bg-orange-500 text-white border border-syrian-red hover:bg-syrian-red"
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isGenerating ? "جارٍ إنشاء PDF..." : "تحميل PDF"}
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="bg-orange-500 text-white border border-syrian-red hover:bg-syrian-red"
              >
                <Home className="w-4 h-4 ml-2" />
                الرئيسية
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="bg-orange-500 text-white border border-syrian-red hover:bg-syrian-red"
              >
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
            <strong>تم إصدار البوليصة بنجاح!</strong> يمكنك الآن طباعة البوليصة أو تحميلها كملف PDF.
          </AlertDescription>
        </Alert>

        <div ref={printRef}>
          <Card className="shadow-xl print:shadow-none print:border-0">
            <CardHeader className="text-center bg-primary text-white print:bg-white print:text-black border-b-4 border-primary-600">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Shield className="w-12 h-12" />
                <div>
                  <CardTitle className="text-2xl font-bold">
                    بوليصة التأمين الإلزامي للمركبات
                  </CardTitle>
                  <p className="text-lg opacity-90 print:text-gray-600">
                    الجمهورية العربية السورية
                  </p>
                </div>
              </div>

              <div className="bg-white/10 print:bg-gray-100 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm opacity-80 print:text-gray-600">رقم البوليصة</p>
                    <p className="text-xl font-bold">{policyData.policyNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-80 print:text-gray-600">تاريخ/وقت الإصدار</p>
                    <p className="text-xl font-bold">{formatDateTime(policyData.issueAt)}</p>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8 space-y-8">
              {/* Validity */}
              <div className="bg-primary-50 print:bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-primary-800 print:text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  فترة صلاحية البوليصة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-primary-600 print:text-gray-600">تاريخ/وقت البداية</p>
                    <p className="text-xl font-bold text-primary-800 print:text-gray-800">
                      {formatDateTime(policyData.startAt)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-primary-600 print:text-gray-600">تاريخ/وقت الانتهاء</p>
                    <p className="text-xl font-bold text-destructive">
                      {formatDateTime(policyData.endAt)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-primary-600 print:text-gray-600">مدة التأمين</p>
                    <Badge className="text-lg px-4 py-2">
                      {getDurationLabel(policyData.policyDuration)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Insured */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  بيانات المؤمن له
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">الاسم الكامل</p>
                    <p className="text-lg font-medium">{policyData.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">الرقم الوطني / جواز</p>
                    <p className="text-lg font-medium font-mono">{policyData.nationalId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">رقم الهاتف</p>
                    <p className="text-lg font-medium font-mono">{policyData.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">العنوان</p>
                    <p className="text-lg font-medium">{policyData.address}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  بيانات المركبة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">رقم اللوحة</p>
                    <p className="text-xl font-bold font-mono bg-white px-3 py-2 rounded border-2">
                      {policyData.plateNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">رقم الهيكل (VIN)</p>
                    <p className="text-lg font-medium font-mono">{policyData.chassisNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">الماركة والموديل</p>
                    <p className="text-lg font-medium">
                      {policyData.brand} {policyData.model}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">سنة الصنع</p>
                    <p className="text-lg font-medium">{policyData.year}</p>
                  </div>
                  {policyData.color && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">اللون</p>
                      <p className="text-lg font-medium">{policyData.color}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Coverage */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  تفاصيل التغطية التأمينية
                </h3>

                <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">نوع التغطية</p>
                      <Badge
                        variant={policyData.coverage === "comprehensive" ? "default" : "secondary"}
                        className="text-lg px-4 py-2"
                      >
                        {getCoverageLabel(policyData.coverage)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">قيمة القسط الإجمالي</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(policyData.premium)}
                      </p>
                    </div>
                  </div>

                  {policyData.breakdown && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span>البدل الصافي:</span>
                          <span>{formatCurrency(policyData.breakdown.netPremium)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>رسم الطابع:</span>
                          <span>{formatCurrency(policyData.breakdown.stampFee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>المجهود الحربي:</span>
                          <span>{formatCurrency(policyData.breakdown.warEffort)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>طابع الشهيد:</span>
                          <span>{formatCurrency(policyData.breakdown.martyrFund)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>الإدارة المحلية:</span>
                          <span>{formatCurrency(policyData.breakdown.localAdministration)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>إعادة الإعمار:</span>
                          <span>{formatCurrency(policyData.breakdown.reconstruction)}</span>
                        </div>

                        {(safeNum(policyData.breakdown.agesFee) > 0 ||
                          safeNum(policyData.breakdown.federationFee) > 0) && (
                          <>
                            <div className="flex justify-between">
                              <span>رسم الأعمار:</span>
                              <span>{formatCurrency(safeNum(policyData.breakdown.agesFee))}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>رسم الاتحاد:</span>
                              <span>{formatCurrency(safeNum(policyData.breakdown.federationFee))}</span>
                            </div>
                          </>
                        )}

                        {/* ✅ الخدمات الإضافية (رسوم) */}
                        {showServices && (
                          <>
                            <div className="md:col-span-2">
                              <Separator className="my-2" />
                              <div className="font-bold text-gray-800 mb-2">الخدمات الإضافية</div>

                              <div className="space-y-2">
                                {policyData.services?.electronicCard && (
                                  <div className="flex justify-between">
                                    <span>البطاقة الإلكترونية</span>
                                    <span>{formatCurrency(safeNum(policyData.breakdown.electronicCardFee))}</span>
                                  </div>
                                )}
                                {policyData.services?.premiumService && (
                                  <div className="flex justify-between">
                                    <span>خدمة العملاء المميزة</span>
                                    <span>{formatCurrency(safeNum(policyData.breakdown.premiumServiceFee))}</span>
                                  </div>
                                )}
                                {policyData.services?.rescueService && (
                                  <div className="flex justify-between">
                                    <span>خدمة الإنقاذ</span>
                                    <span>{formatCurrency(safeNum(policyData.breakdown.rescueServiceFee))}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        <div className="md:col-span-2">
                          <Separator className="my-2" />
                          <div className="flex justify-between text-base font-bold">
                            <span>الإجمالي:</span>
                            <span className="text-primary">
                              {formatCurrency(policyData.breakdown.total || policyData.premium)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {policyData.notes && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-1">ملاحظات</p>
                      <p className="text-base">{policyData.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Terms */}
              <div className="text-sm text-gray-600 space-y-2">
                <h4 className="font-bold text-gray-800">الشروط والأحكام:</h4>
                <ul className="list-disc list-inside space-y-1 mr-4">
                  <li>هذه البوليصة صالحة لفترة التأمين المحددة أعلاه فقط</li>
                  <li>يجب حمل هذه البوليصة في المركبة في جميع الأوقات</li>
                  <li>في حالة وقوع حادث، يجب الاتصال بشركة التأمين فوراً</li>
                  <li>تسري أحكام قانون التأمين الإلزامي السوري على هذه البوليصة</li>
                  <li>يُعتبر هذا المستند بمثابة إثبات التأمين الصالح قانونياً</li>
                </ul>
              </div>

              {/* Footer */}
              <div className="text-center pt-6 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">صادر عن:</p>
                    <p className="font-bold">
                      {policyData.issuedByCenter || "مكتب التأمين المعتمد"}
                    </p>

                    {policyData.issuedByCenterIp && (
                      <p className="text-xs text-gray-600">IP: {policyData.issuedByCenterIp}</p>
                    )}
                    {policyData.issuedByEmployee && (
                      <p className="text-xs text-gray-600">الموظف: {policyData.issuedByEmployee}</p>
                    )}

                    <p className="text-sm text-gray-600">
                      بموجب ترخيص اتحاد شركات التأمين السورية
                    </p>
                  </div>

                  {/* ✅ مكان ختم المكتب -> QR */}
                  <div className="text-center">
                    <div className="w-24 h-24 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-white overflow-hidden">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="QR" className="w-24 h-24 object-contain" />
                      ) : (
                        <p className="text-xs text-gray-500">جارٍ توليد QR...</p>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-gray-500">QR للتحقق</p>
                  </div>

                  <div className="text-left">
                    <p className="text-sm text-gray-600">التاريخ/الوقت:</p>
                    <p className="font-bold">{formatDateTime(policyData.issueAt)}</p>
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <p className="text-xs text-gray-500">
                        توقيع الموظف: {policyData.issuedByEmployee || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* اختياري: اعرض رابط التحقق نصياً تحت الـ QR */}
                {/* <p className="mt-3 text-[10px] text-gray-400">{qrValue}</p> */}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
