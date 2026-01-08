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
  Car,
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
import { metaApi } from "../services/api";

interface VehicleData {
  ownerName: string;
  nationalId: string;
  phoneNumber: string;
  address: string;

  plateNumber: string;
  chassisNumber: string;
  engineNumber: string;

  brand: string; // نخزن _id للماركة
  model: string; // نص الموديل
  year: string;

  color: string; // اسم اللون
  fuelType: string;

  policyDuration: string;
  coverage: string;
  notes: string;
}

type DbColor = { _id: string; name: string; ccid?: number };

type MakeObj = {
  _id: string;
  make: string;
  type?: string;
  legacyId?: number;
};

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

  // string[]
  if (typeof arr[0] === "string") return arr.filter(Boolean);

  // object[]
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

export default function Dashboard() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);

  const [makes, setMakes] = useState<MakeObj[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [colors, setColors] = useState<DbColor[]>([]);

  // ✅ لتحسين الأداء: لا نرسم عناصر القوائم إلا عند الفتح
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [colorSearch, setColorSearch] = useState("");

  const [vehicleData, setVehicleData] = useState<VehicleData>({
    ownerName: "",
    nationalId: "",
    phoneNumber: "",
    address: "",

    plateNumber: "",
    chassisNumber: "",
    engineNumber: "",

    brand: "",
    model: "",
    year: "",

    color: "",
    fuelType: "",

    policyDuration: "",
    coverage: "",
    notes: "",
  });

  const handleInputChange = (field: keyof VehicleData, value: string) => {
    setVehicleData((prev) => ({ ...prev, [field]: value }));
  };

  const employeeName = localStorage.getItem("employeeName") || "";
  const centerName = localStorage.getItem("centerName") || "";


  // ✅ تحميل الماركات + الألوان
  useEffect(() => {
    (async () => {
      try {
        setLoadingMeta(true);

        const [makesRes, colorsRes] = await Promise.all([
          metaApi.getMakes().catch(() => []),
          metaApi.getColors().catch(() => []),
        ]);

        setMakes(normalizeMakes(makesRes));
        setColors(normalizeColors(colorsRes));
      } catch (e) {
        console.error(e);
        setMakes([]);
        setColors([]);
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, []);

  // ✅ عند تغيير الماركة
  const onMakeChange = (makeId: string) => {
    handleInputChange("brand", makeId);
    handleInputChange("model", "");
    setModels([]);
  };

  // ✅ تحميل الموديلات بعد اختيار الماركة
  useEffect(() => {
    (async () => {
      if (!vehicleData.brand) {
        setModels([]);
        return;
      }

      try {
        setLoadingModels(true);

        // بعض APIs تتوقع اسم الماركة وليس _id
        const selected =
          makes.find((m) => m._id === vehicleData.brand) ||
          makes.find((m) => m.make === vehicleData.brand);

        const makeKey = selected?.make || vehicleData.brand;

        const res = await metaApi.getModels(makeKey).catch(() => []);
        setModels(normalizeModels(res));
      } catch (e) {
        console.error(e);
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    })();
  }, [vehicleData.brand, makes]);

  const years = useMemo(
    () => Array.from({ length: 25 }, (_, i) => String(new Date().getFullYear() - i)),
    []
  );

  const steps = useMemo(
    () => [
      { number: 1, title: "بيانات المالك", icon: User },
      { number: 2, title: "بيانات المركبة", icon: Car },
      { number: 3, title: "بيانات التأمين", icon: FileText },
    ],
    []
  );

  // ✅ اسم الماركة المختارة لعرضه داخل المستطيل
  const selectedMakeName = useMemo(() => {
    const selected =
      makes.find((m) => m._id === vehicleData.brand) ||
      makes.find((m) => m.make === vehicleData.brand);
    return selected?.make || "";
  }, [makes, vehicleData.brand]);

  // ✅ Filtered makes based on search (starts with first letter)
  const filteredMakes = useMemo(() => {
    if (!brandSearch.trim()) return makes;
    const searchLower = brandSearch.trim().toLowerCase();
    return makes.filter((m) => 
      m.make.toLowerCase().startsWith(searchLower)
    );
  }, [makes, brandSearch]);

  // ✅ Filtered colors based on search (starts with first letter)
  const filteredColors = useMemo(() => {
    if (!colorSearch.trim()) return colors;
    const searchLower = colorSearch.trim().toLowerCase();
    return colors.filter((c) => 
      c.name.toLowerCase().startsWith(searchLower)
    );
  }, [colors, colorSearch]);

  // ✅ عناصر القوائم (memo)
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
      models.map((name) => (
        <SelectItem key={name} value={name}>
          {name}
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

  const colorItems = useMemo(
    () =>
      colors.map((c) => (
        <SelectItem key={c._id} value={c.name}>
          {c.name}
        </SelectItem>
      )),
    [colors]
  );

  const handleNextStep = () => currentStep < 3 && setCurrentStep((s) => s + 1);
  const handlePrevStep = () => currentStep > 1 && setCurrentStep((s) => s - 1);

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return (
          !!vehicleData.ownerName &&
          !!vehicleData.nationalId &&
          !!vehicleData.phoneNumber &&
          !!vehicleData.address
        );
      case 2:
        return (
          !!vehicleData.plateNumber &&
          !!vehicleData.chassisNumber &&
          !!vehicleData.brand &&
          !!vehicleData.model &&
          !!vehicleData.year
        );
      case 3:
        return !!vehicleData.policyDuration && !!vehicleData.coverage;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      const vehiclePayload = {
        ...vehicleData,
        vehicleType: "syrian" as const,
        year: parseInt(vehicleData.year, 10) || new Date().getFullYear(),
      };

      const { vehicleApi } = await import("../services/api");
      const response = await vehicleApi.create(vehiclePayload);
      

      if (response?.success && response?.data) {
        localStorage.setItem(
          "vehicleData",
          JSON.stringify({
            ...vehicleData,
            vehicleId: response.data._id,
          })
        );
        navigate("/payment");
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
      <div className="bg-white0 shadow-lg border-b border-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-700 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">منصة التأمين الإلزامي</h1>
                <p className="text-sm text-gray-800">إصدار بوليصة جديدة</p>
                
              </div>
            </div>

            <div className="text-right text-gray-800">
  <div className="text-sm">المركز: <b>{centerName || "—"}</b></div>
  <div className="text-xs opacity-90">الموظف: {employeeName || "—"}</div>
</div>


            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="bg-primary-600
    border-b
    border-primary-700
    hover:bg-primary-700
    transition-colors
    text-white"
              >
                <Home className="w-4 h-4" />
                الرئيسية
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/syrian-records")}
                className="bg-primary-600
    border-b
    border-primary-700
    hover:bg-primary-700
    transition-colors
    text-white"
              >
                <FileText className="w-4 h-4" />
                السجلات السورية
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem("isAuthenticated");
                  localStorage.removeItem("username");
                  navigate("/login");
                }}
                className="bg-red-700
    text-white
    border
    border-red-700
    hover:bg-red-600"
              >
                تسجيل الخروج
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
                        ? "bg-primary border-primary text-white"
                        : "bg-white border-gray-300 text-gray-400"
                    )}
                  >
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium mt-2 transition-colors",
                      currentStep >= step.number ? "text-primary" : "text-gray-400"
                    )}
                  >
                    {step.title}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-1 mx-4 transition-colors",
                      currentStep > step.number ? "bg-primary" : "bg-gray-200"
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
                      placeholder="اسم المالك كما هو مدون في الهوية"
                      className="text-right"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nationalId" className="flex items-center gap-2">
                      <IdCard className="w-4 h-4" />
                      الرقم الوطني *
                    </Label>
                    <Input
                      id="nationalId"
                      value={vehicleData.nationalId}
                      onChange={(e) => handleInputChange("nationalId", e.target.value)}
                      placeholder="الرقم الوطني (11 رقم)"
                      className="text-right"
                      maxLength={11}
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
                      placeholder="رقم الهاتف المحمول"
                      className="text-right"
                      required
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      العنوان *
                    </Label>
                    <Input
                      id="address"
                      value={vehicleData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="المحافظة، المدينة، الحي"
                      className="text-right"
                      required
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
                      <Car className="w-4 h-4" />
                      رقم اللوحة *
                    </Label>
                    <Input
                      id="plateNumber"
                      value={vehicleData.plateNumber}
                      onChange={(e) => handleInputChange("plateNumber", e.target.value)}
                      placeholder="رقم لوحة السيارة"
                      className="text-right"
                      required
                      dir="ltr"
                    />
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

                  {/* ✅ Brand - Searchable Combobox */}
                  <div className="space-y-2">
                    <Label htmlFor="brand">الماركة *</Label>
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

                  {/* ✅ Model */}
                  <div className="space-y-2">
                    <Label htmlFor="model">الموديل *</Label>
                    <Select
                      value={vehicleData.model}
                      onValueChange={(v) => handleInputChange("model", v)}
                      disabled={!vehicleData.brand || loadingModels || models.length === 0}
                      open={modelOpen}
                      onOpenChange={setModelOpen}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue
                          placeholder={
                            !vehicleData.brand
                              ? "اختر الماركة أولاً"
                              : loadingModels
                              ? "جارٍ تحميل الموديلات..."
                              : "اختر الموديل"
                          }
                        >
                          {vehicleData.model ? vehicleData.model : undefined}
                        </SelectValue>
                      </SelectTrigger>

                      <SelectContent>
                        {modelOpen ? modelItems : null}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ✅ Year */}
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
                              {filteredColors.map((color) => (
                                <CommandItem
                                  key={color._id}
                                  value={color.name}
                                  onSelect={() => {
                                    handleInputChange("color", color.name);
                                    setColorOpen(false);
                                    setColorSearch("");
                                  }}
                                  className="text-right"
                                >
                                  <Check
                                    className={cn(
                                      "ml-2 h-4 w-4",
                                      vehicleData.color === color.name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {color.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>نوع الوقود</Label>
                    <Select
                      value={vehicleData.fuelType}
                      onValueChange={(value) => handleInputChange("fuelType", value)}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر نوع الوقود">
                          {vehicleData.fuelType ? vehicleData.fuelType : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="بنزين">بنزين</SelectItem>
                        <SelectItem value="ديزل">ديزل</SelectItem>
                        <SelectItem value="هجين">هجين</SelectItem>
                        <SelectItem value="كهربائي">كهربائي</SelectItem>
                        <SelectItem value="غاز">غاز</SelectItem>
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
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      مدة البوليصة *
                    </Label>
                    <Select
                      value={vehicleData.policyDuration}
                      onValueChange={(value) => handleInputChange("policyDuration", value)}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر مدة التأمين">
                          {vehicleData.policyDuration ? vehicleData.policyDuration : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3months">3 أشهر</SelectItem>
                        <SelectItem value="6months">6 أشهر</SelectItem>
                        <SelectItem value="12months">سنة كاملة</SelectItem>
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
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر نوع التغطية">
                          {vehicleData.coverage ? vehicleData.coverage : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="third-party">تأمين ضد الغير</SelectItem>
                        <SelectItem value="comprehensive">تأمين شامل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ملاحظات إضافية</Label>
                  <Textarea
                    value={vehicleData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="أي معلومات إضافية أو ملاحظات خاصة..."
                    className="text-right min-h-[100px]"
                    rows={4}
                  />
                </div>

                <Card className="bg-primary-50 border-primary-200">
                  <CardHeader>
                    <CardTitle className="text-primary-800">ملخص البيانات</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-primary-700">المالك: </span>
                        <span>{vehicleData.ownerName}</span>
                      </div>
                      <div>
                        <span className="font-medium text-primary-700">رقم اللوحة: </span>
                        <span>{vehicleData.plateNumber}</span>
                      </div>
                      <div>
                        <span className="font-medium text-primary-700">المركبة: </span>
                        <span>
                          {selectedMakeName || "غير محدد"} {vehicleData.model} {vehicleData.year}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-primary-700">اللون: </span>
                        <Badge variant="secondary">{vehicleData.color || "غير محدد"}</Badge>
                      </div>
                      <div>
                        <span className="font-medium text-primary-700">مدة التأمين: </span>
                        <Badge variant="secondary">
                          {vehicleData.policyDuration === "3months"
                            ? "3 أشهر"
                            : vehicleData.policyDuration === "6months"
                            ? "6 أشهر"
                            : vehicleData.policyDuration === "12months"
                            ? "سنة كاملة"
                            : "غير محدد"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Separator className="my-6" />

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

              {currentStep < 3 ? (
                <Button
                  onClick={handleNextStep}
                  disabled={!isStepValid(currentStep)}
                  className="flex items-center gap-2"
                >
                  التالي
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!isStepValid(currentStep) || isLoading}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-600"
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
