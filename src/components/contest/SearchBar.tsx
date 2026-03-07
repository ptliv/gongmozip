"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: { input: "h-10 text-sm pl-9 pr-10",   icon: "w-4 h-4 left-3" },
  md: { input: "h-12 text-sm pl-10 pr-10",  icon: "w-4 h-4 left-3.5" },
  lg: { input: "h-14 text-base pl-12 pr-12", icon: "w-5 h-5 left-4" },
};

export function SearchBar({
  value: externalValue,
  onChange,
  onSearch,
  placeholder = "공모전, 대외활동, 키워드로 검색",
  size = "md",
  className,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState("");
  const isControlled = externalValue !== undefined;
  const value = isControlled ? externalValue : internalValue;
  const s = sizeStyles[size];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    if (!isControlled) setInternalValue(newVal);
    onChange?.(newVal);
  };

  const handleClear = () => {
    if (!isControlled) setInternalValue("");
    onChange?.("");
    onSearch?.("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSearch?.(value);
  };

  return (
    <div className={cn("relative", className)}>
      <Search
        className={cn(
          "absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-colors",
          s.icon
        )}
      />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-2xl border border-gray-200 bg-white",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:shadow-blue-glow/30",
          "placeholder:text-gray-400 text-gray-900",
          "shadow-sm hover:border-gray-300 hover:shadow-card",
          "transition-all duration-150",
          s.input
        )}
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:scale-90 transition-all"
          aria-label="검색어 지우기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
