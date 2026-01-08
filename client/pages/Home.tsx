import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Alert, AlertDescription } from "../components/ui/alert";
import { 
  Car, 
  Globe, 
  FileText, 
  Users, 
  Shield, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  ArrowLeft,
  Info,
  MapPin,
  IdCard,
  Phone,
  Calendar
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  
  const employeeName = localStorage.getItem("employeeName") || "الموظف";
  const centerName = localStorage.getItem("centerName") || "";
  

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-md border-b">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
             <img 
  src="/2006EB2A-87F3-4A19-998F-B1A7CBB9DABA.png" 
  alt="Logo"
  className="w-[68px] h-[68px] object-contain"
/>

              <div className="flex flex-col">
  <h1 className="text-xl font-bold text-gray-800">
    منصة التأمين الإلزامي
  </h1>

  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
    <span>
      مرحباً <strong>{employeeName}</strong>
    </span>

    <span className="w-px h-4 bg-gray-300"></span>

    <span>
      مركز: <strong>{centerName}</strong>
    </span>
  </div>
</div>

            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => navigate("/records")} className="  bg-primary-800
    border-b
    border-primary-700
    hover:bg-primary-700
    transition-colors
    text-white">
                  <FileText className="w-4 h-4 ml-2" />
                  السجلات
                </Button>
                <Button variant="outline" onClick={() => navigate("/syrian-records")} className="  bg-primary-800
    border-b
    border-primary-700
    hover:bg-primary-700
    transition-colors
    text-white">
                  <Car className="w-4 h-4 ml-2" />
                  السورية
                </Button>
                <Button variant="outline" onClick={() => navigate("/foreign-records")} className="  bg-primary-800
    border-b
    border-primary-700
    hover:bg-primary-700
    transition-colors
    text-white">
                  <Globe className="w-4 h-4 ml-2" />
                  الأجنبية
                </Button>
              </div>
              <Button variant="outline" onClick={() => {
                localStorage.removeItem("isAuthenticated");
                localStorage.removeItem("username");
                localStorage.removeItem("employeeName");
                navigate("/login");
              }} className="    bg-red-700
    text-white
    border
    border-red-700
    hover:bg-red-600">
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <Alert className="bg-gray-100 border-gray-300">
            <Info className="w-5 h-5 text-gray-700" />
            <AlertDescription className="text-gray-900 text-righ">
              <strong>مرحباً بك في منصة التأمين الإلزامي للمركبات</strong><br />
              اختر نوع المركبة التي تريد إصدار تأمين لها واتبع التعليمات المناسبة
            </AlertDescription>
          </Alert>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Syrian Vehicles */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-primary-700">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Car className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-primary-800">تأمين المركبات السورية</CardTitle>
              <CardDescription className="text-lg">
                للمركبات المسجلة في الجمهورية العربية السورية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className=" p-4 rounded-lg">
                <h4 className="font-bold text-primary-800 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  الوثائق المطلوبة:
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <IdCard className="w-4 h-4 text-primary-700 mt-0.5 flex-shrink-0" />
                    <span>الهوية الشخصية لمالك المركبة</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-primary-700 mt-0.5 flex-shrink-0" />
                    <span>إجازة السوق سارية المفعول</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Car className="w-4 h-4 text-primary-700 mt-0.5 flex-shrink-0" />
                    <span>شهادة تسجيل المركبة</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-primary-700 mt-0.5 flex-shrink-0" />
                    <span>شهادة الفحص الفني (إن وجدت)</span>
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  معلومات مهمة:
                </h4>
                <ul className="space-y-1 text-sm text-yellow-700">
                  <li>• يجب التأكد من صحة رقم اللوحة ورقم الهيكل</li>
                  <li>• التحقق من تطابق البيانات مع الوثائق الرسمية</li>
                  <li>• التأكد من سريان مفعول إجازة السوق</li>
                </ul>
              </div>

              <Button 
                onClick={() => navigate("/syrian-vehicles")}
                className="w-full h-12 text-lg bg-primary-700 hover:bg-primary-800"
              >
                إصدار تأمين للمركبات السورية
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Foreign Vehicles */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-syrian-red">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-syrian-red rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-orange-700">تأمين المركبات الأجنبية</CardTitle>
              <CardDescription className="text-lg">
                للمركبات الأجنبية العابرة أو المؤقتة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className=" p-4 rounded-lg">
                <h4 className="font-bold text-orange-700 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  الوثائق المطلوبة:
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <IdCard className="w-4 h-4 text-orange-700 mt-0.5 flex-shrink-0" />
                    <span>جواز السفر أو الهوية الشخصية</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-orange-700 mt-0.5 flex-shrink-0" />
                    <span>رخصة القيادة الدولية أو المحلية</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Car className="w-4 h-4 text-orange-700 mt-0.5 flex-shrink-0" />
                    <span>شهادة تسجيل المركبة من بلد المنشأ</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-orange-700 mt-0.5 flex-shrink-0" />
                    <span>أوراق العبور الجمركي</span>
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  تنبيهات هامة:
                </h4>
                <ul className="space-y-1 text-sm text-yellow-700">
                  <li>• التأكد من صحة ترجمة الوثائق الأجنبية</li>
                  <li>• التحقق من صلاحية أوراق العبور</li>
                  <li>• تحديد مدة الإقامة المؤقتة بدقة</li>
                </ul>
              </div>

              <Button 
                onClick={() => navigate("/foreign-vehicles")}
                className="w-full h-12 text-lg bg-syrian-red hover:bg-orange-700"
              >
                إصدار تأمين للمركبات الأجنبية
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Instructions Section */}
        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              تعليمات عامة للموظفين
            </CardTitle>
            <CardDescription>
              إرشادات مهمة لضمان دقة وسلامة عملية إصدار البوليصات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  خطوات العمل:
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 mr-4">
                  <li>التحقق من هوية العميل والوثائق المطلوبة</li>
                  <li>مراجعة صحة البيانات وتطابقها مع الوثائق</li>
                  <li>إدخال البيانات بدقة في النظام</li>
                  <li>مراجعة المعلومات قبل المتابعة للدفع</li>
                  <li>التأكد من إتمام عملية الدفع بنجاح</li>
                  <li>طباعة البوليصة وتسليمها للعميل</li>
                </ol>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  نقاط مهمة:
                </h4>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 mr-4">
                  <li>عدم قبول الوثائق المنتهية الصلاحية</li>
                  <li>التأكد من وضوح الصور والنسخ</li>
                  <li>مراجعة أرقام الهواتف للتواصل</li>
                  <li>التحقق من دقة عنوان العميل</li>
                  <li>حفظ نسخ من الوثائق المهمة</li>
                  <li>إبلاغ المشرف في الية الشك</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <Car className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-xl text-primary-700">بوليصات اليوم</h3>
              <p className="text-3xl font-bold text-gray-800">0</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-syrian-red rounded-full flex items-center justify-center mx-auto mb-3">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-xl text-orange-700">مركبات أجنبية</h3>
              <p className="text-3xl font-bold text-gray-800">0</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-xl text-green-700">مكتملة</h3>
              <p className="text-3xl font-bold text-gray-800">0</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-xl text-red-600">قيد المعالجة</h3>
              <p className="text-3xl font-bold text-gray-800">0</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
