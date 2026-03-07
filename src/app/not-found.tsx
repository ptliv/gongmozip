import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 text-center">
      {/* 404 숫자 */}
      <div className="text-[7rem] sm:text-[9rem] font-black text-gray-100 leading-none tracking-tighter select-none mb-2">
        404
      </div>

      {/* 아이콘 */}
      <div className="relative mb-6 -mt-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100/70 flex items-center justify-center shadow-sm">
          <Home className="w-8 h-8 text-blue-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 opacity-20 blur-sm" />
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-2">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-gray-500 mb-8 max-w-[260px] leading-relaxed">
        요청하신 페이지가 없거나 이동되었습니다.
        <br />주소를 다시 확인해주세요.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link href="/" className="btn-primary">
          <ArrowLeft className="w-4 h-4" />
          홈으로 돌아가기
        </Link>
        <Link href="/contests" className="btn-secondary">
          공고 목록 보기
        </Link>
      </div>
    </div>
  );
}
