import { cn } from "@/lib/utils";

// ----------------------------------------------------------
// FormField — 라벨 + 입력 래퍼
// ----------------------------------------------------------

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({ label, required, hint, error, className, children }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 leading-relaxed">{hint}</p>}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

// ----------------------------------------------------------
// 공통 입력 스타일
// ----------------------------------------------------------

export const inputClass =
  "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
  "placeholder:text-gray-400 transition-all duration-150 hover:border-gray-300 " +
  "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed";

// ----------------------------------------------------------
// InputField
// ----------------------------------------------------------

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
}

export function InputField({ label, required, hint, error, className, ...props }: InputFieldProps) {
  return (
    <FormField label={label} required={required} hint={hint} error={error}>
      <input className={cn(inputClass, className)} {...props} />
    </FormField>
  );
}

// ----------------------------------------------------------
// SelectField
// ----------------------------------------------------------

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function SelectField({ label, required, hint, error, options, placeholder, className, ...props }: SelectFieldProps) {
  return (
    <FormField label={label} required={required} hint={hint} error={error}>
      <select className={cn(inputClass, "cursor-pointer", className)} {...props}>
        {placeholder && (
          <option value="" disabled>{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </FormField>
  );
}

// ----------------------------------------------------------
// TextareaField
// ----------------------------------------------------------

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
}

export function TextareaField({ label, required, hint, error, className, ...props }: TextareaFieldProps) {
  return (
    <FormField label={label} required={required} hint={hint} error={error}>
      <textarea className={cn(inputClass, "resize-y min-h-[120px] leading-relaxed", className)} {...props} />
    </FormField>
  );
}

// ----------------------------------------------------------
// MultiChipField — 다중 선택
// ----------------------------------------------------------

interface MultiChipFieldProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T[];
  onChange: (value: T[]) => void;
  hint?: string;
}

export function MultiChipField<T extends string>({ label, options, value, onChange, hint }: MultiChipFieldProps<T>) {
  const toggle = (opt: T) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };

  return (
    <FormField label={label} hint={hint}>
      <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-gray-200 bg-white min-h-[52px]">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 active:scale-95",
              value.includes(opt)
                ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-600/20 ring-offset-1"
                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
            )}
          >
            {opt}
          </button>
        ))}
        {options.length === 0 && (
          <span className="text-xs text-gray-400 self-center">옵션 없음</span>
        )}
      </div>
    </FormField>
  );
}

// ----------------------------------------------------------
// ToggleField — boolean 토글
// ----------------------------------------------------------

interface ToggleFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleField({ label, description, checked, onChange }: ToggleFieldProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors">
      <div>
        <div className="text-sm font-semibold text-gray-700">{label}</div>
        {description && (
          <div className="text-xs text-gray-400 mt-0.5">{description}</div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 flex-shrink-0",
          checked ? "bg-blue-600 shadow-sm" : "bg-gray-200"
        )}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}
