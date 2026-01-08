import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Home, ArrowLeft, AlertTriangle } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-md w-full shadow-xl bg-white/95 backdrop-blur-sm">
        <CardContent className="text-center p-8">
          <div className="mb-6">
            <div className="w-20 h-20 bg-destructive rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-6xl font-bold text-primary-900 mb-2">404</h1>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">الصفحة غير موجودة</h2>
            <p className="text-gray-600 mb-6">
              عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى موقع آخر
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/")}
              className="w-full flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              العودة للصفحة الرئيسية
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => navigate(-1)}
              className="w-full flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              العودة للصفحة السابقة
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Car className="w-4 h-4" />
              <span>منصة التأمين الإلزامي السورية</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
