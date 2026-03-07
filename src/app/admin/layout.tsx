import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { createSSRClient } from "@/lib/supabase/ssr";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 미들웨어가 이미 인증을 보장하지만, 사이드바에 이메일을 표시하기 위해 조회
  const supabase = createSSRClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* 사이드바 — 데스크톱만 */}
      <div className="hidden lg:flex">
        <AdminSidebar userEmail={user?.email} />
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
