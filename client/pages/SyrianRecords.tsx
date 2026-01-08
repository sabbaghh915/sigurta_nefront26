import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Car,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  FileText,
  Plus,
  Home,
  Globe,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SyrianPolicyRecord {
  id: string;
  /** ✅ id الخاص بسجل الدفعة/البوليصة (إن وجد) لاستخدامه في PDF */
  policyId?: string;
  policyNumber: string;
  receiptNumber?: string;
  ownerName: string;
  nationalId: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: string;
  color?: string;
  manufacturer?: string;
  coverage: string;
  startDate: string;
  endDate: string;
  premium: number;
  paymentStatus?: string;
  paymentMethod?: string;
  paidBy?: string;
  payerPhone?: string;
  center?: string;
  insuranceCompany?: string;
  status: "active" | "expired" | "cancelled";
  createdAt: string;
  vehicleType: "syrian";
}

// ✅ API helper (يدعم VITE_API_URL + JWT)
const API_BASE_URL = (import.meta.env.VITE_API_URL?.replace(/\/$/, "")) || "http://localhost:3000/api";

async function apiGet<T>(path: string): Promise<T> {
  const token =
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  localStorage.getItem("authToken") ||
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("accessToken");
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(token ? { "x-auth-token": token } : {}),
  },
   credentials: "omit",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data as T;
}

async function apiGetFirst<T>(paths: string[]): Promise<T> {
  let lastErr: any = null;
  for (const p of paths) {
    try {
      return await apiGet<T>(p);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No endpoint matched");
}

// ✅ Payments normalization (مثل صفحة AdminPayments)
type PaymentDoc = {
  _id?: string;
  vehicleModel?: string;
  vehicleId?: string;
  policyNumber?: string;
  receiptNumber?: string;
  amount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  paidBy?: string;
  payerPhone?: string;
  center?: any;
  insuranceCompany?: any;
  processedBy?: any;
  issuedAt?: string;
  policyStartAt?: string;
  policyEndAt?: string;
  pricingInput?: any;
  breakdown?: any;
  paymentDate?: string;
  createdAt?: string;
};

const extractArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.payments)) return res.payments;
  return [];
};

const oid = (v: any) => (typeof v === "string" ? v : v?.$oid ? String(v.$oid) : undefined);
const dt = (v: any) => (typeof v === "string" ? v : v?.$date ? new Date(v.$date).toISOString() : undefined);

const normalizePayment = (raw: any): PaymentDoc => {
  if (!raw || typeof raw !== "object") return {};
  return {
    _id: oid(raw._id) || raw._id || raw.id,
    vehicleModel: raw.vehicleModel,
    vehicleId: oid(raw.vehicleId) || raw.vehicleId,
    policyNumber: raw.policyNumber,
    receiptNumber: raw.receiptNumber ?? raw.reference,
    amount: raw.amount ?? raw.total ?? raw.breakdown?.total,
    paymentMethod: raw.paymentMethod ?? raw.method,
    paymentStatus: raw.paymentStatus ?? raw.status,
    paidBy: raw.paidBy,
    payerPhone: raw.payerPhone,
    center: raw.center,
    insuranceCompany: raw.insuranceCompany,
    processedBy: raw.processedBy,
    issuedAt: dt(raw.issuedAt) ?? raw.issuedAt,
    policyStartAt: dt(raw.policyStartAt) ?? raw.policyStartAt,
    policyEndAt: dt(raw.policyEndAt) ?? raw.policyEndAt,
    pricingInput: raw.pricingInput,
    breakdown: raw.breakdown,
    paymentDate: dt(raw.paymentDate) ?? raw.paymentDate,
    createdAt: dt(raw.createdAt) ?? raw.createdAt,
  };
};

const displayRef = (v: any): string => {
  if (!v) return "";
  if (typeof v === "string") return v;
  const name = v?.name || v?.title || v?.code;
  const id = oid(v?._id) || v?._id || v?.id;
  return String(name || id || "");
};

const shortId = (s?: string) => {
  if (!s) return "—";
  return s.length > 18 ? `${s.slice(0, 10)}…${s.slice(-4)}` : s;
};

export default function SyrianRecords() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<SyrianPolicyRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<SyrianPolicyRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SyrianPolicyRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const { vehicleApi } = await import("../services/api");

        // ✅ حاول جلب الدفعات/البوليصات من السيرفر (عدة endpoints محتملة)
        const [vehiclesRes, paymentsRes] = await Promise.all([
          vehicleApi.getAll({ vehicleType: "syrian" }),
          apiGetFirst<any>(["/payments", "/payments/list", "/admin/payments"]).catch(() => ({ data: [] })),
        ]);

        const vehicles = Array.isArray(vehiclesRes?.data) ? vehiclesRes.data : [];
        const payments = extractArray(paymentsRes).map(normalizePayment);

        // ✅ خريطة: آخر دفعة لكل مركبة سورية
        const latestByVehicle = new Map<string, PaymentDoc>();
        const latestTs = new Map<string, number>();
        for (const p of payments) {
          const vid = p.vehicleId;
          if (!vid) continue;
          const isSyrian = /syrian/i.test(String(p.vehicleModel || ""));
          if (!isSyrian) continue;
          const t = new Date(p.createdAt || p.paymentDate || p.issuedAt || 0).getTime();
          const prev = latestTs.get(vid) ?? -1;
          if (t >= prev) {
            latestByVehicle.set(vid, p);
            latestTs.set(vid, t);
          }
        }

        const transformedRecords: SyrianPolicyRecord[] = vehicles.map((vehicle: any) => {
          const vehicleId = String(vehicle?._id || "");
          const pay = latestByVehicle.get(vehicleId);

          const createdAtIso = vehicle?.createdAt || pay?.createdAt || pay?.paymentDate || new Date().toISOString();

          const startRaw = pay?.policyStartAt || vehicle?.startDate || pay?.issuedAt || vehicle?.createdAt;
          const endRaw = pay?.policyEndAt || vehicle?.endDate;

          const startDate = startRaw ? new Date(startRaw).toISOString().split("T")[0] : "";
          const endDate = endRaw
            ? new Date(endRaw).toISOString().split("T")[0]
            : startRaw
            ? new Date(new Date(startRaw).setFullYear(new Date(startRaw).getFullYear() + 1)).toISOString().split("T")[0]
            : "";

          // ✅ الحالة: أولوية لتواريخ البوليصة
          let status: "active" | "expired" | "cancelled" = vehicle?.status || "active";
          if (status !== "cancelled" && endDate) {
            status = new Date(endDate) < new Date() ? "expired" : "active";
          }

          const premium =
            (typeof pay?.amount === "number" ? pay.amount : undefined) ??
            (typeof pay?.breakdown?.total === "number" ? pay.breakdown.total : undefined) ??
            (vehicle?.insurance?.total ?? vehicle?.insuranceTotal ?? vehicle?.premium ?? 0);

          const coverage =
            pay?.pricingInput?.insuranceType || vehicle?.coverage || (vehicle?.insuranceType ? String(vehicle.insuranceType) : "third-party");

          const color = vehicle?.color?.name || vehicle?.colorName || vehicle?.color || vehicle?.carColor?.name || "";
          const manufacturer = vehicle?.manufacturer || vehicle?.manufacturerName || vehicle?.make?.manufacturer || vehicle?.maker || vehicle?.producer || "";
          const centerDisp = displayRef(pay?.center || vehicle?.center);
          const companyDisp = displayRef(pay?.insuranceCompany || vehicle?.insuranceCompany);

          return {
            id: vehicleId,
            policyId: pay?._id || vehicleId,
            policyNumber: pay?.policyNumber || vehicle?.policyNumber || "N/A",
            receiptNumber: pay?.receiptNumber,
            ownerName: vehicle?.ownerName || "",
            nationalId: vehicle?.nationalId || "",
            plateNumber: vehicle?.plateNumber || "",
            brand: vehicle?.brand || "",
            model: vehicle?.model || "",
            year: vehicle?.year?.toString?.() || "",
            color,
            manufacturer,
            coverage,
            startDate,
            endDate,
            premium: Number(premium || 0),
            paymentStatus: pay?.paymentStatus,
            paymentMethod: pay?.paymentMethod,
            paidBy: pay?.paidBy,
            payerPhone: pay?.payerPhone,
            center: centerDisp,
            insuranceCompany: companyDisp,
            status,
            createdAt: createdAtIso,
            vehicleType: "syrian",
          };
        });

        // ✅ الأحدث أولاً
        transformedRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setRecords(transformedRecords);
        setFilteredRecords(transformedRecords);
      } catch (error) {
        console.error("Error loading records:", error);
        setRecords([]);
        setFilteredRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecords();
  }, []);

  useEffect(() => {
    let filtered = records;

    // Search (case-insensitive)
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((r) => {
        const owner = (r.ownerName || "").toLowerCase();
        const pol = (r.policyNumber || "").toLowerCase();
        const rcp = (r.receiptNumber || "").toLowerCase();
        const plate = (r.plateNumber || "").toLowerCase();
        const nid = (r.nationalId || "").toLowerCase();
        return owner.includes(term) || pol.includes(term) || rcp.includes(term) || plate.includes(term) || nid.includes(term);
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const today = new Date();
      filtered = filtered.filter((r) => {
        const recordDate = new Date(r.createdAt);
        switch (dateFilter) {
          case "today":
            return recordDate.toDateString() === today.toDateString();
          case "week": {
            const weekAgo = new Date();
            weekAgo.setDate(today.getDate() - 7);
            return recordDate >= weekAgo;
          }
          case "month": {
            const monthAgo = new Date();
            monthAgo.setMonth(today.getMonth() - 1);
            return recordDate >= monthAgo;
          }
          default:
            return true;
        }
      });
    }

    setFilteredRecords(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [records, searchTerm, statusFilter, dateFilter]);

  const stats = useMemo(() => {
    const total = records.length;
    const active = records.filter((r) => r.status === "active").length;
    const expired = records.filter((r) => r.status === "expired").length;
    const totalPremium = records.reduce((sum, r) => sum + (r.premium || 0), 0);
    return { total, active, expired, totalPremium };
  }, [records]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "ساري المفعول", variant: "default" as const },
      expired: { label: "منتهي الصلاحية", variant: "destructive" as const },
      cancelled: { label: "ملغي", variant: "secondary" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (st?: string) => {
    const s = String(st || "").toLowerCase();
    if (!s) return <Badge variant="outline">—</Badge>;
    const map: Record<string, { label: string; variant: any }> = {
      completed: { label: "مكتمل", variant: "default" },
      paid: { label: "مدفوع", variant: "default" },
      pending: { label: "معلق", variant: "secondary" },
      unpaid: { label: "غير مدفوع", variant: "secondary" },
      failed: { label: "فشل", variant: "destructive" },
      cancelled: { label: "ملغي", variant: "destructive" },
    };
    const cfg = map[s] || { label: st || "—", variant: "outline" };
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  const getCoverageLabel = (coverage: string) => {
    const c = String(coverage || "").toLowerCase();
    if (c === "third-party" || c === "thirdparty") return "تأمين ضد الغير";
    if (c === "comprehensive") return "تأمين شامل";
    if (c === "internal") return "تأمين داخلي";
    if (c === "border" || c === "border-insurance") return "تأمين حدود";
    return coverage || "—";
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ar-SY", { style: "currency", currency: "SYP", minimumFractionDigits: 0 }).format(amount || 0);

  const formatDate = (dateString: string) => (dateString ? new Date(dateString).toLocaleDateString("ar-SY") : "-");

  // ✅ Actions
  const handlePreview = (policyId: string) => {
    // معاينة داخل التطبيق
    navigate(`/pdf?policy=${policyId}`);
  };

  const handleDownload = (policyId: string) => {
    // تحميل (حسب صفحة pdf عندك)
    // ممكن تخليه window.open ليفتح تبويب جديد
    window.open(`/pdf?policy=${policyId}&download=true`, "_blank");
  };

  const handleEdit = (id: string) => {
    // يفتح نفس صفحة إنشاء البوليصة لكن بوضع edit
    navigate(`/syrian-vehicles?edit=${id}`);
  };

  const openDeleteDialog = (record: SyrianPolicyRecord) => {
    setDeleteTarget(record);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;

    setIsDeleting(true);
    try {
      const { vehicleApi } = await import("../services/api");

      // دعم أسماء مختلفة للدالة حسب مشروعك
      const delFn =
        (vehicleApi as any).delete ||
        (vehicleApi as any).remove ||
        (vehicleApi as any).deleteOne ||
        (vehicleApi as any).deleteById;

      if (!delFn) {
        throw new Error("delete/remove api method not found in vehicleApi");
      }

      const res = await delFn(deleteTarget.id);

      if (res?.success === false) {
        throw new Error(res?.message || "فشل حذف البوليصة");
      }

      // تحديث الواجهة مباشرة
      setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setFilteredRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));

      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (e) {
      console.error("Delete error:", e);
      alert("تعذر حذف البوليصة. تحقق من السيرفر أو الصلاحيات.");
    } finally {
      setIsDeleting(false);
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
                <h1 className="text-xl font-bold text-gray-800">سجلات السيارات السورية</h1>
                <p className="text-sm text-gray-800">تأمين المركبات المسجلة في سوريا</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/records")}
                className="bg-primary-600
    border-b
    border-primary-700
    hover:bg-primary-700
    transition-colors
    text-white"
              >
                <FileText className="w-4 h-4 ml-2" />
                كل السجلات
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/foreign-records")}
                className="bg-primary-600
    border-b
    border-primary-700
    hover:bg-primary-700
    transition-colors
    text-white"
              >
                <Globe className="w-4 h-4 ml-2" />
                السجلات الأجنبية
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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6 border-primary-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary-800">
              <Filter className="w-5 h-5" />
              البحث والتصفية - السيارات السورية
            </CardTitle>
            <CardDescription className="text-primary-600">ابحث وصفي بوليصات السيارات السورية حسب المعايير المختلفة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">البحث</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="اسم المالك، رقم البوليصة، رقم اللوحة، الرقم الوطني..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-3 pr-10 text-right"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">الحالة</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="active">ساري المفعول</SelectItem>
                    <SelectItem value="expired">منتهي الصلاحية</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">تاريخ الإنشاء</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع التواريخ</SelectItem>
                    <SelectItem value="today">اليوم</SelectItem>
                    <SelectItem value="week">آخر أسبوع</SelectItem>
                    <SelectItem value="month">آخر شهر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">تصدير</label>
                <Button variant="outline" className="w-full flex items-center gap-2" disabled>
                  <Download className="w-4 h-4" />
                  تصدير Excel (لاحقاً)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mb-6">
          <Card className="bg-primary-50 border-primary-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-primary-800">إجراءات سريعة</h3>
                  <p className="text-primary-600">إضافة بوليصة جديدة أو إدارة السجلات</p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => navigate("/syrian-vehicles")} className="bg-primary hover:bg-primary-600">
                    <Plus className="w-4 h-4 ml-2" />
                    بوليصة سورية جديدة
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="border-primary-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي البوليصات السورية</p>
                  <p className="text-2xl font-bold text-primary">{stats.total}</p>
                </div>
                <Car className="w-8 h-8 text-primary-300" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">ساري المفعول</p>
                  <p className="text-2xl font-bold text-success">{stats.active}</p>
                </div>
                <Badge className="w-8 h-8 rounded-full bg-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">منتهي الصلاحية</p>
                  <p className="text-2xl font-bold text-destructive">{stats.expired}</p>
                </div>
                <Calendar className="w-8 h-8 text-destructive/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي الأقساط</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(stats.totalPremium)}</p>
                </div>
                <FileText className="w-8 h-8 text-primary-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              سجلات السيارات السورية ({filteredRecords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">جارٍ تحميل السجلات...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-8">
                <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">لا توجد سجلات سيارات سورية مطابقة للمعايير المحددة</p>
                <Button onClick={() => navigate("/syrian-vehicles")} className="mt-4 bg-primary hover:bg-primary-600">
                  إضافة بوليصة جديدة
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رقم البوليصة</TableHead>
                      <TableHead className="text-right">رقم الإيصال</TableHead>
                      <TableHead className="text-right">القسط</TableHead>
                      <TableHead className="text-right">حالة الدفع</TableHead>
                      <TableHead className="text-right">طريقة الدفع</TableHead>
                      <TableHead className="text-right">الدافع</TableHead>
                      <TableHead className="text-right">الهاتف</TableHead>
                      <TableHead className="text-right">المركز</TableHead>
                      <TableHead className="text-right">شركة التأمين</TableHead>
                      <TableHead className="text-right">المؤمن له</TableHead>
                      <TableHead className="text-right">الرقم الوطني</TableHead>
                      <TableHead className="text-right">الماركة/الموديل</TableHead>
                      <TableHead className="text-right">اللون</TableHead>
                      <TableHead className="text-right">الصانع</TableHead>
                      <TableHead className="text-right">رقم اللوحة</TableHead>
                      <TableHead className="text-right">نوع التغطية</TableHead>
                      <TableHead className="text-right">تاريخ البداية</TableHead>
                      <TableHead className="text-right">تاريخ الانتهاء</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium text-primary">{record.policyNumber}</TableCell>
                        <TableCell className="font-mono text-xs">{record.receiptNumber || "—"}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(record.premium)}</TableCell>
                        <TableCell>{getPaymentStatusBadge(record.paymentStatus)}</TableCell>
                        <TableCell className="text-sm">{record.paymentMethod || "—"}</TableCell>
                        <TableCell>{record.paidBy || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{record.payerPhone || "—"}</TableCell>
                        <TableCell className="text-xs" title={record.center || ""}>{shortId(record.center)}</TableCell>
                        <TableCell className="text-xs" title={record.insuranceCompany || ""}>{shortId(record.insuranceCompany)}</TableCell>
                        <TableCell>
                          <p className="font-medium">{record.ownerName}</p>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{record.nationalId}</TableCell>
                        <TableCell>
                          {record.brand} {record.model} {record.year}
                        </TableCell>
                        <TableCell>{record.color || "—"}</TableCell>
                        <TableCell>{record.manufacturer || "—"}</TableCell>
                        <TableCell className="font-mono font-bold">{record.plateNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCoverageLabel(record.coverage)}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(record.startDate)}</TableCell>
                        <TableCell>{formatDate(record.endDate)}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>

                        {/* ✅ Actions */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* معاينة */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreview(record.policyId || record.id)}
                              title="معاينة PDF"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {/* تحميل */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(record.policyId || record.id)}
                              title="تحميل PDF"
                            >
                              <Download className="w-4 h-4" />
                            </Button>

                            {/* تعديل */}
                            <Button size="sm" variant="outline" onClick={() => handleEdit(record.id)} title="تعديل البوليصة">
                              <Pencil className="w-4 h-4" />
                            </Button>

                            {/* حذف */}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDeleteDialog(record)}
                              title="حذف البوليصة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && filteredRecords.length > 0 && totalPages > 1 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((prev) => Math.max(1, prev - 1));
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {getPageNumbers().map((page, index) => (
                      <PaginationItem key={index}>
                        {page === "ellipsis" ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page as number);
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                        }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                <div className="text-center mt-4 text-sm text-gray-600">
                  عرض {startIndex + 1} - {Math.min(endIndex, filteredRecords.length)} من {filteredRecords.length} سجل
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ✅ Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد أنك تريد حذف هذه البوليصة؟
              <br />
              <span className="font-bold">
                {deleteTarget ? `${deleteTarget.policyNumber} - ${deleteTarget.ownerName}` : ""}
              </span>
              <br />
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جارٍ الحذف...
                </span>
              ) : (
                "نعم، احذف"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
