"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, CheckCircle, AlertCircle, Loader2, Trash2 } from "lucide-react";
import {
  Contest,
  ContestFormValues,
  ContestStatus,
  VerifiedLevel,
  CONTEST_TYPES,
  CONTEST_CATEGORIES,
  CONTEST_FIELDS,
  TARGET_GROUPS,
  CONTEST_STATUSES,
  REGIONS,
  ONLINE_OFFLINE_OPTIONS,
  BENEFIT_TYPES,
} from "@/types/contest";
import { cn } from "@/lib/utils";
import {
  InputField,
  SelectField,
  TextareaField,
  MultiChipField,
  ToggleField,
} from "./form/FormField";
import {
  createContestAction,
  updateContestAction,
  deleteContestAction,
} from "@/app/admin/contests/actions";

// ----------------------------------------------------------
// 내부 헬퍼
// ----------------------------------------------------------

function toFormValues(contest: Contest): ContestFormValues {
  const { id, slug, view_count, created_at, updated_at, ...rest } = contest;
  return rest;
}

function emptyFormValues(): ContestFormValues {
  return {
    title: "",
    organizer: "",
    summary: "",
    description: "",
    poster_image_url: null,
    type: "공모전",
    category: "아이디어·기획",
    field: "IT·테크",
    target: ["대학생"],
    region: "무관",
    online_offline: "온라인",
    team_allowed: false,
    apply_start_at: "",
    apply_end_at: "",
    status: "upcoming",
    benefit: { prize: "", types: [] },
    official_source_url: "",
    aggregator_source_url: null,
    verified_level: 0,
  };
}

// ----------------------------------------------------------
// Props
// ----------------------------------------------------------

interface ContestFormProps {
  /** 수정 모드일 때 기존 데이터 */
  initialData?: Contest;
  /** 수정 모드일 때 공고 ID — undefined이면 신규 등록 */
  contestId?: string;
}

// ----------------------------------------------------------
// 메인 컴포넌트
// ----------------------------------------------------------

export function ContestForm({ initialData, contestId }: ContestFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ContestFormValues>(
    initialData ? toFormValues(initialData) : emptyFormValues()
  );

  // 저장 상태
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  // 삭제 상태
  const [deleteState, setDeleteState] = useState<"idle" | "deleting" | "error">("idle");
  const [deleteError, setDeleteError] = useState("");

  const set = <K extends keyof ContestFormValues>(
    key: K,
    value: ContestFormValues[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  // ----------------------------------------------------------
  // 저장 핸들러
  // ----------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveState("saving");
    setSaveError("");

    if (contestId) {
      // 수정 모드 — 현재 페이지 유지, "저장됨" 배너 표시
      const result = await updateContestAction(contestId, values);
      if (result?.error) {
        setSaveError(result.error);
        setSaveState("error");
        setTimeout(() => setSaveState("idle"), 5000);
      } else {
        setSaveState("saved");
        router.refresh(); // 서버 컴포넌트 데이터 갱신
        setTimeout(() => setSaveState("idle"), 3000);
      }
    } else {
      // 신규 등록 — 성공 시 서버에서 목록으로 리다이렉트
      const result = await createContestAction(values);
      if (result?.error) {
        setSaveError(result.error);
        setSaveState("error");
        setTimeout(() => setSaveState("idle"), 5000);
      }
      // 성공 시 redirect()가 서버에서 실행되어 자동 이동
    }
  };

  // ----------------------------------------------------------
  // 삭제 핸들러
  // ----------------------------------------------------------

  const handleDelete = async () => {
    if (!contestId) return;
    if (!confirm("이 공고를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) return;

    setDeleteState("deleting");
    setDeleteError("");

    const result = await deleteContestAction(contestId);
    if (result?.error) {
      setDeleteError(result.error);
      setDeleteState("error");
      setTimeout(() => setDeleteState("idle"), 5000);
    }
    // 성공 시 redirect()가 서버에서 실행되어 목록으로 이동
  };

  const isEditing = !!contestId;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── 저장 피드백 배너 ── */}
      {saveState !== "idle" && (
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium",
            saveState === "saving" && "bg-blue-50 text-blue-700",
            saveState === "saved" && "bg-emerald-50 text-emerald-700",
            saveState === "error" && "bg-red-50 text-red-700"
          )}
        >
          {saveState === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
          {saveState === "saved" && <CheckCircle className="w-4 h-4" />}
          {saveState === "error" && <AlertCircle className="w-4 h-4" />}
          {saveState === "saving" && "저장 중..."}
          {saveState === "saved" && "저장되었습니다."}
          {saveState === "error" && (saveError || "저장에 실패했습니다. 다시 시도해주세요.")}
        </div>
      )}

      {/* ── 섹션 1: 기본 정보 ── */}
      <FormSection title="기본 정보">
        <InputField
          label="제목"
          required
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="예: 삼성 청년 SW 아카데미 13기 모집"
        />
        <InputField
          label="주최기관"
          required
          value={values.organizer}
          onChange={(e) => set("organizer", e.target.value)}
          placeholder="예: 삼성전자"
        />
        <InputField
          label="한 줄 요약"
          required
          value={values.summary}
          onChange={(e) => set("summary", e.target.value)}
          placeholder="공고를 한 문장으로 요약 (카드에 표시됨)"
          hint="최대 100자 권장"
          maxLength={120}
        />
        <InputField
          label="공식 지원 URL"
          required
          type="url"
          value={values.official_source_url}
          onChange={(e) => set("official_source_url", e.target.value)}
          placeholder="https://..."
        />
        <InputField
          label="원문 출처 URL"
          type="url"
          value={values.aggregator_source_url ?? ""}
          onChange={(e) =>
            set("aggregator_source_url", e.target.value || null)
          }
          placeholder="https://... (선택)"
          hint="링커리어, 씽유 등 원문 게시 페이지 URL"
        />
      </FormSection>

      {/* ── 섹션 2: 분류 ── */}
      <FormSection title="분류">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SelectField
            label="유형"
            required
            value={values.type}
            onChange={(e) =>
              set("type", e.target.value as ContestFormValues["type"])
            }
            options={CONTEST_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <SelectField
            label="카테고리"
            required
            value={values.category}
            onChange={(e) =>
              set("category", e.target.value as ContestFormValues["category"])
            }
            options={CONTEST_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <SelectField
            label="분야"
            required
            value={values.field}
            onChange={(e) =>
              set("field", e.target.value as ContestFormValues["field"])
            }
            options={CONTEST_FIELDS.map((f) => ({ value: f, label: f }))}
          />
        </div>
      </FormSection>

      {/* ── 섹션 3: 모집 조건 ── */}
      <FormSection title="모집 조건">
        <MultiChipField
          label="지원 대상"
          options={TARGET_GROUPS}
          value={values.target}
          onChange={(v) => set("target", v)}
          hint="해당하는 대상을 모두 선택하세요"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="모집 시작일"
            required
            type="date"
            value={values.apply_start_at}
            onChange={(e) => set("apply_start_at", e.target.value)}
          />
          <InputField
            label="모집 종료일 (마감일)"
            required
            type="date"
            value={values.apply_end_at}
            onChange={(e) => set("apply_end_at", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="지역"
            value={values.region}
            onChange={(e) =>
              set("region", e.target.value as ContestFormValues["region"])
            }
            options={REGIONS.map((r) => ({ value: r, label: r }))}
          />
          <SelectField
            label="진행 방식"
            value={values.online_offline}
            onChange={(e) =>
              set("online_offline", e.target.value as ContestFormValues["online_offline"])
            }
            options={ONLINE_OFFLINE_OPTIONS.map((o) => ({ value: o, label: o }))}
          />
        </div>
        <ToggleField
          label="팀 지원 가능"
          description="팀으로 지원할 수 있는 경우 활성화"
          checked={values.team_allowed}
          onChange={(v) => set("team_allowed", v)}
        />
      </FormSection>

      {/* ── 섹션 4: 혜택 ── */}
      <FormSection title="혜택">
        <InputField
          label="혜택 요약"
          value={values.benefit.prize ?? ""}
          onChange={(e) =>
            set("benefit", { ...values.benefit, prize: e.target.value || undefined })
          }
          placeholder="예: 최대 500만원, 월 30만원 활동비"
          hint="카드에 표시될 혜택 요약 문구"
        />
        <MultiChipField
          label="혜택 종류"
          options={BENEFIT_TYPES}
          value={values.benefit.types}
          onChange={(v) => set("benefit", { ...values.benefit, types: v })}
        />
      </FormSection>

      {/* ── 섹션 5: 상세 내용 ── */}
      <FormSection title="상세 내용">
        <TextareaField
          label="설명"
          required
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="공고 상세 내용을 입력하세요. 단락 구분은 빈 줄(엔터 2번)로 합니다."
          hint="단락 구분은 빈 줄로 구분됩니다 (\n\n)"
          rows={10}
          className="min-h-[200px]"
        />
      </FormSection>

      {/* ── 섹션 6: 상태 관리 ── */}
      <FormSection
        title="상태 관리"
        description="공고의 모집 상태와 검수 레벨을 설정합니다"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="모집 상태"
            required
            value={values.status}
            onChange={(e) => set("status", e.target.value as ContestStatus)}
            options={[
              { value: "upcoming", label: "모집 예정" },
              { value: "ongoing", label: "모집 중" },
              { value: "closed", label: "마감" },
              { value: "canceled", label: "취소됨" },
            ]}
          />
          <SelectField
            label="검수 레벨"
            required
            value={String(values.verified_level)}
            onChange={(e) =>
              set("verified_level", Number(e.target.value) as VerifiedLevel)
            }
            options={[
              { value: "0", label: "0 — 미검증 (기본)" },
              { value: "1", label: "1 — 기본 확인 (URL 유효)" },
              { value: "2", label: "2 — 공식 확인 (운영자 검토)" },
              { value: "3", label: "3 — 공식 제휴" },
            ]}
            hint="검수 레벨 2 이상이면 공식 배지가 사용자에게 표시됩니다"
          />
        </div>

        {/* 빠른 상태 변경 버튼 */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">빠른 상태 변경</div>
          <div className="flex flex-wrap gap-2">
            {[
              { status: "ongoing" as ContestStatus, label: "모집 중으로" },
              { status: "closed" as ContestStatus, label: "마감 처리" },
              { status: "canceled" as ContestStatus, label: "취소 처리" },
            ].map((item) => (
              <button
                key={item.status}
                type="button"
                onClick={() => set("status", item.status)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors",
                  values.status === item.status
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </FormSection>

      {/* ── 하단 버튼 ── */}
      {/* 삭제 에러 배너 */}
      {deleteState === "error" && deleteError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {deleteError}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        {/* 왼쪽: 취소 + 삭제 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            취소
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteState === "deleting"}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteState === "deleting" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              공고 삭제
            </button>
          )}
        </div>

        {/* 오른쪽: 저장 */}
        <button
          type="submit"
          disabled={saveState === "saving"}
          className={cn(
            "inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            saveState === "saving"
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md"
          )}
        >
          {saveState === "saving" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isEditing ? "변경사항 저장" : "공고 등록"}
        </button>
      </div>
    </form>
  );
}

// ----------------------------------------------------------
// FormSection — 섹션 래퍼
// ----------------------------------------------------------

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}
