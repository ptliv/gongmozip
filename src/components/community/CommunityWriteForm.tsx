import type { createCommunityPostAction } from "@/app/(main)/community/write/actions";

interface CommunityWriteFormProps {
  readonly action: typeof createCommunityPostAction;
  readonly userEmail?: string | null;
}

export function CommunityWriteForm({ action, userEmail }: CommunityWriteFormProps) {
  return (
    <form action={action} className="space-y-5 rounded-lg border border-stone-200 bg-white p-5 shadow-card">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-amber-700">Community Write</p>
        <h1 className="mt-2 text-2xl font-black text-zinc-950">커뮤니티 글 작성</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          로그인한 사용자만 작성할 수 있고, 새 글은 관리자 검수 후 공개됩니다.
        </p>
        {userEmail && (
          <p className="mt-2 text-xs font-bold text-zinc-400">로그인 계정: {userEmail}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-bold text-zinc-800">글 유형</span>
          <select name="kind" className="h-11 w-full rounded-md border border-stone-200 px-3 text-sm">
            <option value="general">커뮤니티</option>
            <option value="question">준비 질문</option>
            <option value="team">팀원 모집</option>
            <option value="review">수상 후기</option>
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-bold text-zinc-800">표시 이름</span>
          <input
            name="authorName"
            required
            minLength={2}
            maxLength={24}
            placeholder="예: 기획하는 대학생"
            className="h-11 w-full rounded-md border border-stone-200 px-3 text-sm"
          />
        </label>
      </div>

      <label className="space-y-1.5">
        <span className="text-sm font-bold text-zinc-800">제목</span>
        <input
          name="title"
          required
          minLength={5}
          maxLength={120}
          placeholder="예: 데이터 분석 공모전 팀원 구합니다"
          className="h-11 w-full rounded-md border border-stone-200 px-3 text-sm"
        />
      </label>

      <label className="space-y-1.5">
        <span className="text-sm font-bold text-zinc-800">내용</span>
        <textarea
          name="body"
          required
          minLength={20}
          maxLength={4000}
          rows={8}
          placeholder="상황, 찾는 사람, 진행 방식, 남은 일정 등을 적어주세요."
          className="w-full rounded-md border border-stone-200 px-3 py-3 text-sm leading-relaxed"
        />
      </label>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-black text-amber-900">팀원 모집일 때 입력</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <input name="contestTitle" placeholder="참여 공모전명" className="h-11 rounded-md border border-amber-200 px-3 text-sm" />
          <input name="contestUrl" type="url" placeholder="공모전 링크" className="h-11 rounded-md border border-amber-200 px-3 text-sm" />
          <input name="roles" placeholder="찾는 역할: 기획, 디자인, 개발" className="h-11 rounded-md border border-amber-200 px-3 text-sm" />
          <input name="deadlineAt" type="date" className="h-11 rounded-md border border-amber-200 px-3 text-sm" />
          <input name="contactMethod" placeholder="연락 방식: 오픈채팅, 이메일" className="h-11 rounded-md border border-amber-200 px-3 text-sm" />
          <input name="contactValue" placeholder="연락처 또는 링크" className="h-11 rounded-md border border-amber-200 px-3 text-sm" />
        </div>
      </div>

      <button type="submit" className="btn-primary h-11 w-full justify-center sm:w-auto">
        검수 요청하기
      </button>
    </form>
  );
}
