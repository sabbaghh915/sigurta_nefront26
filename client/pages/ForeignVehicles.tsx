import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/ui/command";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Globe,
  User,
  CreditCard,
  FileText,
  Calendar,
  MapPin,
  Phone,
  IdCard,
  Home,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "../lib/utils";
import { BORDER_VEHICLE_TYPES } from "../constants/insuranceOptions";
import { metaApi } from "../services/api";

interface ForeignVehicleData {
  // Owner Information
  ownerName: string;
  nationality: string;
  passportNumber: string;
  phoneNumber: string;
  homeAddress: string;
  localAddress: string;

  // Vehicle Information
  plateNumber: string;
  plateCountry: string;
  chassisNumber: string;
  engineNumber: string;

  brand: string; // نخزن _id أو الاسم (نعمل normalize)
  model: string; // نص
  year: string;

  color: string; // اسم اللون
  fuelType: string;

  // Entry Information
  entryDate: string;
  exitDate: string;
  entryPoint: string;
  customsDocument: string;

  // Insurance Information
  policyDuration: string;
  coverage: string;
  notes: string;

  borderVehicleType: string;
  insuranceMonths: string;
}

type DbColor = { _id: string; name: string; ccid?: number };
type MakeObj = { _id: string; make: string; type?: string; legacyId?: number };

function monthsToPolicyDuration(months: string) {
  switch (months) {
    case "1":
      return "1month";
    case "2":
      return "2months";
    case "3":
      return "3months";
    case "6":
      return "6months";
    case "12":
      return "12months";
    default:
      return "";
  }
}

function policyDurationLabel(policyDuration: string, insuranceMonths: string) {
  if (insuranceMonths) {
    switch (insuranceMonths) {
      case "1":
        return "شهر واحد";
      case "2":
        return "شهرين";
      case "3":
        return "3 أشهر";
      case "6":
        return "6 أشهر";
      case "12":
        return "سنة كاملة";
    }
  }

  switch (policyDuration) {
    case "1month":
      return "شهر واحد";
    case "2months":
      return "شهرين";
    case "3months":
      return "3 أشهر";
    case "6months":
      return "6 أشهر";
    case "12months":
      return "سنة كاملة";
    default:
      return policyDuration || "-";
  }
}

function normalizeMakes(input: any): MakeObj[] {
  const arr = Array.isArray(input) ? input : [];
  if (!arr.length) return [];

  // string[]
  if (typeof arr[0] === "string") {
    return arr.map((s: string) => ({ _id: s, make: s }));
  }

  // object[]
  return arr
    .map((m: any) => {
      const id = String(m?._id ?? m?.id ?? m?.make ?? m?.name ?? "");
      const make = String(m?.make ?? m?.name ?? m?._id ?? "");
      if (!id || !make) return null;
      return { _id: id, make, type: m?.type, legacyId: m?.legacyId };
    })
    .filter(Boolean) as MakeObj[];
}

function normalizeModels(input: any): string[] {
  const arr = Array.isArray(input) ? input : [];
  if (!arr.length) return [];

  if (typeof arr[0] === "string") return arr.filter(Boolean);

  return arr
    .map((x: any) => String(x?.name ?? x?.model ?? x?.type ?? x?._id ?? ""))
    .filter((s: string) => !!s);
}

function normalizeColors(input: any): DbColor[] {
  const arr = Array.isArray(input) ? input : [];
  return arr
    .map((c: any) => {
      const _id = String(c?._id ?? c?.id ?? c?.name ?? "");
      const name = String(c?.name ?? "");
      if (!_id || !name) return null;
      return { _id, name, ccid: c?.ccid };
    })
    .filter(Boolean) as DbColor[];
}

const NATIONALITIES = [
  { value: "lebanese", label: "لبنانية" },
  { value: "jordanian", label: "أردنية" },
  { value: "iraqi", label: "عراقية" },
  { value: "turkish", label: "تركية" },
  { value: "palestinian", label: "فلسطينية" },
  { value: "egyptian", label: "مصرية" },
  { value: "saudi", label: "سعودية" },
  { value: "kuwaiti", label: "كويتية" },
  { value: "emirati", label: "إماراتية" },
  { value: "other", label: "أخرى" },
] as const;

const PLATE_COUNTRIES = [
  { value: "lebanon", label: "لبنان" },
  { value: "jordan", label: "الأردن" },
  { value: "iraq", label: "العراق" },
  { value: "turkey", label: "تركيا" },
  { value: "palestine", label: "فلسطين" },
  { value: "egypt", label: "مصر" },
  { value: "saudi", label: "السعودية" },
  { value: "kuwait", label: "الكويت" },
  { value: "uae", label: "الإمارات" },
  { value: "other", label: "أخرى" },
] as const;

const ENTRY_POINTS = [
  { value: "damascus-airport", label: "مطار دمشق الدولي" },
  { value: "aleppo-airport", label: "مطار حلب الدولي" },
  { value: "nassib", label: "معبر نصيب الحدودي" },
  { value: "tanf", label: "معبر التنف" },
  { value: "qasmieh", label: "معبر القاسمية" },
  { value: "arida", label: "معبر العريضة" },
  { value: "tal-kalakh", label: "معبر تل كلخ" },
  { value: "other", label: "أخرى" },
] as const;

const COVERAGES = [
  { value: "third-party", label: "تأمين ضد الغير" },
  { value: "comprehensive", label: "تأمين شامل" },
  { value: "border-insurance", label: "تأمين حدود" },
] as const;

const FUEL_TYPES = [
  { value: "بنزين", label: "بنزين" },
  { value: "ديزل", label: "ديزل" },
  { value: "هجين", label: "هجين" },
  { value: "كهربائي", label: "كهربائي" },
  { value: "غاز", label: "غاز" },
] as const;

const INSURANCE_MONTHS = [
  { value: "1", label: "شهر" },
  { value: "2", label: "شهرين" },
  { value: "3", label: "3 أشهر" },
  { value: "6", label: "6 أشهر" },
  { value: "12", label: "سنة" },
] as const;

const POLICY_DURATIONS = [
  { value: "1month", label: "شهر واحد" },
  { value: "2months", label: "شهرين" },
  { value: "3months", label: "3 أشهر" },
  { value: "6months", label: "6 أشهر" },
  { value: "12months", label: "سنة كاملة" },
] as const;

export default function ForeignVehicles() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ meta
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [makes, setMakes] = useState<MakeObj[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [colors, setColors] = useState<DbColor[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // ✅ Open states (Lazy render)
  const [nationalityOpen, setNationalityOpen] = useState(false);
  const [plateCountryOpen, setPlateCountryOpen] = useState(false);

  const [brandOpen, setBrandOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [colorSearch, setColorSearch] = useState("");
  const [fuelOpen, setFuelOpen] = useState(false);

  const [entryPointOpen, setEntryPointOpen] = useState(false);

  const [borderTypeOpen, setBorderTypeOpen] = useState(false);
  const [monthsOpen, setMonthsOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 35 }, (_, i) => String(y - i));
  }, []);

  const [vehicleData, setVehicleData] = useState<ForeignVehicleData>({
    ownerName: "",
    nationality: "",
    passportNumber: "",
    phoneNumber: "",
    homeAddress: "",
    localAddress: "",

    plateNumber: "",
    plateCountry: "",
    chassisNumber: "",
    engineNumber: "",
    brand: "",
    model: "",
    year: "",
    color: "",
    fuelType: "",

    entryDate: "",
    exitDate: "",
    entryPoint: "",
    customsDocument: "",

    policyDuration: "",
    coverage: "",
    notes: "",

    borderVehicleType: "",
    insuranceMonths: "",
  });

  const handleInputChange = (field: keyof ForeignVehicleData, value: string) => {
    setVehicleData((prev) => {
      if (field === "insuranceMonths") {
        return {
          ...prev,
          insuranceMonths: value,
          policyDuration: monthsToPolicyDuration(value) || prev.policyDuration,
        };
      }
      return { ...prev, [field]: value };
    });
  };

  // ✅ load makes + colors once
  useEffect(() => {
    (async () => {
      try {
        setLoadingMeta(true);
        const [mRes, cRes] = await Promise.all([
          metaApi.getMakes().catch(() => []),
          metaApi.getColors().catch(() => []),
        ]);

        setMakes(normalizeMakes(mRes));
        setColors(normalizeColors(cRes));
      } catch (e) {
        console.error(e);
        setMakes([]);
        setColors([]);
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, []);

  // ✅ selected make name (للإظهار والإرسال)
  const selectedMakeName = useMemo(() => {
    const selected =
      makes.find((m) => m._id === vehicleData.brand) ||
      makes.find((m) => m.make === vehicleData.brand);
    return selected?.make || "";
  }, [makes, vehicleData.brand]);

  const onMakeChange = (makeId: string) => {
    setVehicleData((s) => ({ ...s, brand: makeId, model: "" }));
    setModels([]);
  };

  // ✅ when brand changes => load models
  useEffect(() => {
    (async () => {
      if (!vehicleData.brand) {
        setModels([]);
        return;
      }

      try {
        setLoadingModels(true);
        const makeKey = selectedMakeName || vehicleData.brand;
        const res = await metaApi.getModels(makeKey).catch(() => []);
        setModels(normalizeModels(res));
      } catch (e) {
        console.error(e);
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    })();
  }, [vehicleData.brand, selectedMakeName]);

  // ✅ Labels for trigger display
  const nationalityLabel = useMemo(
    () => NATIONALITIES.find((n) => n.value === vehicleData.nationality)?.label || "",
    [vehicleData.nationality]
  );

  const plateCountryLabel = useMemo(
    () => PLATE_COUNTRIES.find((n) => n.value === vehicleData.plateCountry)?.label || "",
    [vehicleData.plateCountry]
  );

  const entryPointLabel = useMemo(
    () => ENTRY_POINTS.find((n) => n.value === vehicleData.entryPoint)?.label || "",
    [vehicleData.entryPoint]
  );

  const borderTypeLabel = useMemo(
    () => BORDER_VEHICLE_TYPES.find((t) => t.value === vehicleData.borderVehicleType)?.label || "",
    [vehicleData.borderVehicleType]
  );

  const monthsLabel = useMemo(
    () => INSURANCE_MONTHS.find((m) => m.value === vehicleData.insuranceMonths)?.label || "",
    [vehicleData.insuranceMonths]
  );

  const coverageLabel = useMemo(
    () => COVERAGES.find((c) => c.value === vehicleData.coverage)?.label || "",
    [vehicleData.coverage]
  );

  const fuelLabel = useMemo(
    () => FUEL_TYPES.find((f) => f.value === vehicleData.fuelType)?.label || "",
    [vehicleData.fuelType]
  );

  const policyLabel = useMemo(
    () => policyDurationLabel(vehicleData.policyDuration, vehicleData.insuranceMonths),
    [vehicleData.policyDuration, vehicleData.insuranceMonths]
  );

  const fallbackColors = useMemo(
    () => ["أبيض", "أسود", "فضي", "رمادي", "أحمر", "أزرق", "أخضر"],
    []
  );

  // ✅ items (memo) + lazy render
  const nationalityItems = useMemo(
    () =>
      NATIONALITIES.map((n) => (
        <SelectItem key={n.value} value={n.value}>
          {n.label}
        </SelectItem>
      )),
    []
  );

  const plateCountryItems = useMemo(
    () =>
      PLATE_COUNTRIES.map((n) => (
        <SelectItem key={n.value} value={n.value}>
          {n.label}
        </SelectItem>
      )),
    []
  );

  const entryPointItems = useMemo(
    () =>
      ENTRY_POINTS.map((n) => (
        <SelectItem key={n.value} value={n.value}>
          {n.label}
        </SelectItem>
      )),
    []
  );

  // ✅ Filtered makes based on search (starts with first letter)
  const filteredMakes = useMemo(() => {
    if (!brandSearch.trim()) return makes;
    const searchLower = brandSearch.trim().toLowerCase();
    return makes.filter((m) => 
      m.make.toLowerCase().startsWith(searchLower)
    );
  }, [makes, brandSearch]);

  // ✅ Get all available colors (from API or fallback)
  const allColors = useMemo(() => {
    if (colors.length) {
      return colors.map((c) => c.name);
    }
    return fallbackColors;
  }, [colors, fallbackColors]);

  // ✅ Filtered colors based on search (starts with first letter)
  const filteredColors = useMemo(() => {
    if (!colorSearch.trim()) return allColors;
    const searchLower = colorSearch.trim().toLowerCase();
    return allColors.filter((colorName) => 
      colorName.toLowerCase().startsWith(searchLower)
    );
  }, [allColors, colorSearch]);

  const makeItems = useMemo(
    () =>
      makes.map((m) => (
        <SelectItem key={m._id} value={m._id}>
          {m.make}
        </SelectItem>
      )),
    [makes]
  );

  const modelItems = useMemo(
    () =>
      models.map((mm) => (
        <SelectItem key={mm} value={mm}>
          {mm}
        </SelectItem>
      )),
    [models]
  );

  const yearItems = useMemo(
    () =>
      years.map((y) => (
        <SelectItem key={y} value={y}>
          {y}
        </SelectItem>
      )),
    [years]
  );

  const colorItems = useMemo(() => {
    if (colors.length) {
      return colors.map((c) => (
        <SelectItem key={c._id} value={c.name}>
          {c.name}
        </SelectItem>
      ));
    }

    return fallbackColors.map((c) => (
      <SelectItem key={c} value={c}>
        {c}
      </SelectItem>
    ));
  }, [colors, fallbackColors]);

  const fuelItems = useMemo(
    () =>
      FUEL_TYPES.map((f) => (
        <SelectItem key={f.value} value={f.value}>
          {f.label}
        </SelectItem>
      )),
    []
  );

  const borderTypeItems = useMemo(
    () =>
      BORDER_VEHICLE_TYPES.map((t) => (
        <SelectItem key={t.value} value={t.value}>
          {t.label}
        </SelectItem>
      )),
    []
  );

  const monthsItems = useMemo(
    () =>
      INSURANCE_MONTHS.map((m) => (
        <SelectItem key={m.value} value={m.value}>
          {m.label}
        </SelectItem>
      )),
    []
  );

  const policyItems = useMemo(
    () =>
      POLICY_DURATIONS.map((p) => (
        <SelectItem key={p.value} value={p.value}>
          {p.label}
        </SelectItem>
      )),
    []
  );

  const coverageItems = useMemo(
    () =>
      COVERAGES.map((c) => (
        <SelectItem key={c.value} value={c.value}>
          {c.label}
        </SelectItem>
      )),
    []
  );

  const handleNextStep = () => {
    if (currentStep < 4) setCurrentStep((s) => s + 1);
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return Boolean(
          vehicleData.ownerName &&
            vehicleData.nationality &&
            vehicleData.passportNumber &&
            vehicleData.phoneNumber
        );
      case 2:
        return Boolean(
          vehicleData.plateNumber &&
            vehicleData.plateCountry &&
            vehicleData.chassisNumber &&
            vehicleData.brand &&
            vehicleData.model &&
            vehicleData.year
        );
      case 3:
        return Boolean(
          vehicleData.entryDate &&
            vehicleData.exitDate &&
            vehicleData.entryPoint &&
            vehicleData.customsDocument
        );
      case 4:
        return Boolean(
          (vehicleData.insuranceMonths || vehicleData.policyDuration) &&
            vehicleData.coverage &&
            vehicleData.borderVehicleType
        );
      default:
        return false;
    }
  };

  const steps = [
    { number: 1, title: "بيانات المالك", icon: User },
    { number: 2, title: "بيانات المركبة", icon: Globe },
    { number: 3, title: "بيانات الدخول", icon: MapPin },
    { number: 4, title: "بيانات التأمين", icon: FileText },
  ];

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      const address =
        (vehicleData.localAddress || "").trim() ||
        (vehicleData.homeAddress || "").trim();

      if (!address) {
        setError("العنوان مطلوب (العنوان المؤقت في سوريا أو عنوان بلد الإقامة)");
        setIsLoading(false);
        return;
      }

      const pricing = {
        insuranceType: "border" as const,
        borderType: vehicleData.borderVehicleType,
        periodMonths: Number(
          vehicleData.insuranceMonths ||
            (vehicleData.policyDuration === "12months"
              ? 12
              : vehicleData.policyDuration === "6months"
              ? 6
              : vehicleData.policyDuration === "3months"
              ? 3
              : vehicleData.policyDuration === "2months"
              ? 2
              : vehicleData.policyDuration === "1month"
              ? 1
              : 12)
        ),
      };

      const vehiclePayload = {
        vehicleType: "foreign" as const,

        ownerName: vehicleData.ownerName,
        nationalId: vehicleData.passportNumber,
        passportNumber: vehicleData.passportNumber,
        nationality: vehicleData.nationality,
        phoneNumber: vehicleData.phoneNumber,
        address,

        plateNumber: vehicleData.plateNumber,
        chassisNumber: vehicleData.chassisNumber,
        engineNumber: vehicleData.engineNumber || undefined,

        // ✅ نرسل اسم الماركة (أفضل توافق مع الباك)
        brand: selectedMakeName || vehicleData.brand,
        model: vehicleData.model,
        year: Number(vehicleData.year || 0),
        color: vehicleData.color || undefined,
        fuelType: vehicleData.fuelType || undefined,

        plateCountry: vehicleData.plateCountry,
        entryPoint: vehicleData.entryPoint,
        customsDocument: vehicleData.customsDocument,

        entryDate: vehicleData.entryDate
          ? new Date(vehicleData.entryDate).toISOString()
          : undefined,
        exitDate: vehicleData.exitDate
          ? new Date(vehicleData.exitDate).toISOString()
          : undefined,

        policyDuration: vehicleData.policyDuration || undefined,
        coverage: vehicleData.coverage || undefined,
        notes: vehicleData.notes || undefined,

        pricing,
      };

      const { vehicleApi } = await import("../services/api");
      const response = await vehicleApi.create(vehiclePayload);

      if (response.success && response.data) {
        localStorage.setItem(
          "foreignVehicleData",
          JSON.stringify({
            ...vehicleData,
            vehicleId: response.data._id,
            nationalId: vehicleData.passportNumber,
            brand: selectedMakeName || vehicleData.brand, // نخزن الاسم لعرضه لاحقاً
          })
        );
        navigate("/payment-foreign");
      } else {
        setError("حدث خطأ في حفظ البيانات");
      }
    } catch (err: any) {
      console.error("Save vehicle error:", err);
      setError(err?.message || "حدث خطأ في حفظ البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-white
">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-syrian-red rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  تأمين المركبات الأجنبية
                </h1>
                <p className="text-sm text-gray-800">
                  إصدار بوليصة للمركبات الأجنبية
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="bg-orange-500
    text-white
    border
    border-syrian-red
    hover:bg-syrian-red"
              >
                <Home className="w-4 h-4 ml-2" />
                الرئيسية
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/foreign-records")}
                className="bg-orange-500
    text-white
    border
    border-syrian-red
    hover:bg-syrian-red"
              >
                <FileText className="w-4 h-4 ml-2" />
                السجلات الأجنبية
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
                      currentStep >= step.number
                        ? "bg-syrian-red border-syrian-red text-white"
                        : "bg-white border-gray-300 text-gray-400"
                    )}
                  >
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium mt-2 transition-colors",
                      currentStep >= step.number ? "text-red-700" : "text-gray-400"
                    )}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-1 mx-4 transition-colors",
                      currentStep > step.number ? "bg-syrian-red" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription className="text-right">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              {(() => {
                const IconComponent = steps[currentStep - 1].icon;
                return <IconComponent className="w-6 h-6" />;
              })()}
              {steps[currentStep - 1].title}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1 */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      اسم المالك الكامل *
                    </Label>
                    <Input
                      id="ownerName"
                      value={vehicleData.ownerName}
                      onChange={(e) => handleInputChange("ownerName", e.target.value)}
                      placeholder="الاسم كما هو مدون في جواز السفر"
                      className="text-right"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nationality">الجنسية *</Label>
                    <Select
                      value={vehicleData.nationality}
                      onValueChange={(value) => handleInputChange("nationality", value)}
                      open={nationalityOpen}
                      onOpenChange={setNationalityOpen}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر الجنسية">
                          {nationalityLabel ? nationalityLabel : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {nationalityOpen ? nationalityItems : null}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passportNumber" className="flex items-center gap-2">
                      <IdCard className="w-4 h-4" />
                      رقم جواز السفر *
                    </Label>
                    <Input
                      id="passportNumber"
                      value={vehicleData.passportNumber}
                      onChange={(e) => handleInputChange("passportNumber", e.target.value)}
                      placeholder="رقم جواز السفر"
                      className="text-right"
                      required
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      رقم الهاتف *
                    </Label>
                    <Input
                      id="phoneNumber"
                      value={vehicleData.phoneNumber}
                      onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                      placeholder="رقم الهاتف للتواصل"
                      className="text-right"
                      required
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="homeAddress" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      العنوان في بلد الإقامة
                    </Label>
                    <Input
                      id="homeAddress"
                      value={vehicleData.homeAddress}
                      onChange={(e) => handleInputChange("homeAddress", e.target.value)}
                      placeholder="العنوان في البلد الأصلي"
                      className="text-right"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="localAddress">العنوان المؤقت في سوريا</Label>
                    <Input
                      id="localAddress"
                      value={vehicleData.localAddress}
                      onChange={(e) => handleInputChange("localAddress", e.target.value)}
                      placeholder="مكان الإقامة المؤقت في سوريا"
                      className="text-right"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="plateNumber" className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      رقم اللوحة *
                    </Label>
                    <Input
                      id="plateNumber"
                      value={vehicleData.plateNumber}
                      onChange={(e) => handleInputChange("plateNumber", e.target.value)}
                      placeholder="رقم لوحة المركبة"
                      className="text-right"
                      required
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plateCountry">دولة التسجيل *</Label>
                    <Select
                      value={vehicleData.plateCountry}
                      onValueChange={(value) => handleInputChange("plateCountry", value)}
                      open={plateCountryOpen}
                      onOpenChange={setPlateCountryOpen}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر دولة تسجيل المركبة">
                          {plateCountryLabel ? plateCountryLabel : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {plateCountryOpen ? plateCountryItems : null}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chassisNumber">رقم الهيكل *</Label>
                    <Input
                      id="chassisNumber"
                      value={vehicleData.chassisNumber}
                      onChange={(e) => handleInputChange("chassisNumber", e.target.value)}
                      placeholder="رقم الهيكل (VIN)"
                      className="text-right"
                      required
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="engineNumber">رقم المحرك</Label>
                    <Input
                      id="engineNumber"
                      value={vehicleData.engineNumber}
                      onChange={(e) => handleInputChange("engineNumber", e.target.value)}
                      placeholder="رقم المحرك"
                      className="text-right"
                      dir="ltr"
                    />
                  </div>

                  {/* ✅ Brand from DB - Searchable Combobox */}
                  <div className="space-y-2">
                    <Label>الماركة *</Label>
                    <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={brandOpen}
                          className="w-full justify-between text-right"
                          disabled={loadingMeta}
                        >
                          {selectedMakeName || (loadingMeta ? "جارٍ تحميل الماركات..." : "اختر ماركة السيارة")}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="ابحث بالحرف الأول..."
                            value={brandSearch}
                            onValueChange={setBrandSearch}
                            className="text-right"
                          />
                          <CommandList>
                            <CommandEmpty>لا توجد ماركات تبدأ بهذا الحرف</CommandEmpty>
                            <CommandGroup>
                              {filteredMakes.map((make) => (
                                <CommandItem
                                  key={make._id}
                                  value={make.make}
                                  onSelect={() => {
                                    onMakeChange(make._id);
                                    setBrandOpen(false);
                                    setBrandSearch("");
                                  }}
                                  className="text-right"
                                >
                                  <Check
                                    className={cn(
                                      "ml-2 h-4 w-4",
                                      vehicleData.brand === make._id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {make.make}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* ✅ Model from DB by brand */}
                  <div className="space-y-2">
                    <Label>النوع / الموديل *</Label>

                    {models.length > 0 ? (
                      <Select
                        value={vehicleData.model}
                        onValueChange={(value) => handleInputChange("model", value)}
                        disabled={!vehicleData.brand || loadingModels}
                        open={modelOpen}
                        onOpenChange={setModelOpen}
                      >
                        <SelectTrigger className="text-right">
                          <SelectValue
                            placeholder={
                              !vehicleData.brand
                                ? "اختر الماركة أولاً"
                                : loadingModels
                                ? "جارٍ تحميل الأنواع..."
                                : "اختر النوع"
                            }
                          >
                            {vehicleData.model ? vehicleData.model : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {modelOpen ? modelItems : null}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={vehicleData.model}
                        onChange={(e) => handleInputChange("model", e.target.value)}
                        placeholder={
                          vehicleData.brand
                            ? "لا توجد أنواع لهذه الماركة (اكتب يدوياً)"
                            : "اختر الماركة أولاً"
                        }
                        className="text-right"
                        disabled={!vehicleData.brand || loadingModels}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>سنة الصنع *</Label>
                    <Select
                      value={vehicleData.year}
                      onValueChange={(value) => handleInputChange("year", value)}
                      open={yearOpen}
                      onOpenChange={setYearOpen}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر سنة الصنع">
                          {vehicleData.year ? vehicleData.year : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {yearOpen ? yearItems : null}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ✅ Color - Searchable Combobox */}
                  <div className="space-y-2">
                    <Label>لون السيارة</Label>
                    <Popover open={colorOpen} onOpenChange={setColorOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={colorOpen}
                          className="w-full justify-between text-right"
                          disabled={loadingMeta}
                        >
                          {vehicleData.color || (loadingMeta ? "جارٍ تحميل الألوان..." : "اختر لون السيارة")}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="ابحث بالحرف الأول..."
                            value={colorSearch}
                            onValueChange={setColorSearch}
                            className="text-right"
                          />
                          <CommandList>
                            <CommandEmpty>لا توجد ألوان تبدأ بهذا الحرف</CommandEmpty>
                            <CommandGroup>
                              {filteredColors.map((colorName) => (
                                <CommandItem
                                  key={colorName}
                                  value={colorName}
                                  onSelect={() => {
                                    handleInputChange("color", colorName);
                                    setColorOpen(false);
                                    setColorSearch("");
                                  }}
                                  className="text-right"
                                >
                                  <Check
                                    className={cn(
                                      "ml-2 h-4 w-4",
                                      vehicleData.color === colorName ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {colorName}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* ✅ Fuel */}
                  <div className="space-y-2">
                    <Label>نوع الوقود</Label>
                    <Select
                      value={vehicleData.fuelType}
                      onValueChange={(value) => handleInputChange("fuelType", value)}
                      open={fuelOpen}
                      onOpenChange={setFuelOpen}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر نوع الوقود">
                          {fuelLabel ? fuelLabel : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {fuelOpen ? fuelItems : null}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="entryDate" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      تاريخ الدخول *
                    </Label>
                    <Input
                      id="entryDate"
                      type="date"
                      value={vehicleData.entryDate}
                      onChange={(e) => handleInputChange("entryDate", e.target.value)}
                      className="text-right"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exitDate" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      تاريخ الخروج المتوقع *
                    </Label>
                    <Input
                      id="exitDate"
                      type="date"
                      value={vehicleData.exitDate}
                      onChange={(e) => handleInputChange("exitDate", e.target.value)}
                      className="text-right"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entryPoint" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      نقطة الدخول *
                    </Label>
                    <Select
                      value={vehicleData.entryPoint}
                      onValueChange={(value) => handleInputChange("entryPoint", value)}
                      open={entryPointOpen}
                      onOpenChange={setEntryPointOpen}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر نقطة الدخول">
                          {entryPointLabel ? entryPointLabel : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {entryPointOpen ? entryPointItems : null}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customsDocument" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      رقم الوثيقة الجمركية *
                    </Label>
                    <Input
                      id="customsDocument"
                      value={vehicleData.customsDocument}
                      onChange={(e) => handleInputChange("customsDocument", e.target.value)}
                      placeholder="رقم وثيقة العبور الجمركي"
                      className="text-right"
                      required
                      dir="ltr"
                    />
                  </div>
                </div>

                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertDescription className="text-yellow-800 text-right">
                    <strong>تنبيه:</strong> يجب التأكد من صحة تواريخ الدخول والخروج وتطابقها مع الوثائق الجمركية
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Step 4 */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>نوع التأمين الحدودي *</Label>
                    <Select
                      value={vehicleData.borderVehicleType}
                      onValueChange={(value) => handleInputChange("borderVehicleType", value)}
                      open={borderTypeOpen}
                      onOpenChange={setBorderTypeOpen}
                    >
                      <SelectTrigger className="h-12 text-right">
                        <SelectValue placeholder="اختر نوع التأمين الحدودي">
                          {borderTypeLabel ? borderTypeLabel : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {borderTypeOpen ? borderTypeItems : null}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>المدة بالأشهر *</Label>
                    <Select
                      value={vehicleData.insuranceMonths}
                      onValueChange={(v) => handleInputChange("insuranceMonths", v)}
                      open={monthsOpen}
                      onOpenChange={setMonthsOpen}
                    >
                      <SelectTrigger className="h-12 text-right">
                        <SelectValue placeholder="اختر المدة">
                          {monthsLabel ? monthsLabel : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {monthsOpen ? monthsItems : null}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      مدة البوليصة (اختياري)
                    </Label>
                    <Select
                      value={vehicleData.policyDuration}
                      onValueChange={(value) => handleInputChange("policyDuration", value)}
                      open={policyOpen}
                      onOpenChange={setPolicyOpen}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر مدة التأمين">
                          {vehicleData.policyDuration ? policyLabel : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {policyOpen ? policyItems : null}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      نوع التغطية *
                    </Label>
                    <Select
                      value={vehicleData.coverage}
                      onValueChange={(value) => handleInputChange("coverage", value)}
                      open={coverageOpen}
                      onOpenChange={setCoverageOpen}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر نوع التغطية">
                          {coverageLabel ? coverageLabel : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {coverageOpen ? coverageItems : null}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ملاحظات إضافية</Label>
                  <Textarea
                    value={vehicleData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="أي معلومات إضافية أو ملاحظات خاصة بالمركبة الأجنبية..."
                    className="text-right min-h-[100px]"
                    rows={4}
                  />
                </div>

                <Card className="bg-red-50 border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-800">ملخص البيانات</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-red-700">المالك: </span>
                        <span>{vehicleData.ownerName}</span>
                      </div>
                      <div>
                        <span className="font-medium text-red-700">الجنسية: </span>
                        <span>{nationalityLabel || vehicleData.nationality || "-"}</span>
                      </div>
                      <div>
                        <span className="font-medium text-red-700">رقم اللوحة: </span>
                        <span>
                          {vehicleData.plateNumber} ({plateCountryLabel || vehicleData.plateCountry || "-"})
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-red-700">المركبة: </span>
                        <span>
                          {(selectedMakeName || vehicleData.brand || "-")} {vehicleData.model} {vehicleData.year}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-red-700">اللون: </span>
                        <Badge variant="secondary">{vehicleData.color || "غير محدد"}</Badge>
                      </div>
                      <div>
                        <span className="font-medium text-red-700">مدة التأمين: </span>
                        <Badge variant="secondary">
                          {policyDurationLabel(vehicleData.policyDuration, vehicleData.insuranceMonths)}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium text-red-700">نوع الحدودي: </span>
                        <Badge variant="outline">{borderTypeLabel || vehicleData.borderVehicleType || "-"}</Badge>
                      </div>
                      <div>
                        <span className="font-medium text-red-700">التغطية: </span>
                        <Badge variant="outline">{coverageLabel || vehicleData.coverage || "-"}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Separator className="my-6" />

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                className="flex items-center gap-2"
              >
                السابق
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  الخطوة {currentStep} من {steps.length}
                </span>
              </div>

              {currentStep < 4 ? (
                <Button
                  onClick={handleNextStep}
                  disabled={!isStepValid(currentStep)}
                  className="flex items-center gap-2 bg-syrian-red hover:bg-red-600"
                >
                  التالي
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!isStepValid(currentStep) || isLoading}
                  className="flex items-center gap-2 bg-syrian-red hover:bg-red-600"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جارٍ الحفظ...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      متابعة للدفع
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
