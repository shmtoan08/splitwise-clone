"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { getUserContacts, ContactItem } from "@/actions/contact";
import { Input } from "@/components/ui/input";
import { BookUser, UserPlus, Check, Sparkles, Plus } from "lucide-react";

interface MemberComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  existingNames?: string[];
}

export function MemberCombobox({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  existingNames = [],
}: MemberComboboxProps) {
  const { status } = useSession();
  const t = useTranslations("participant");
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAuthenticated = status === "authenticated";

  // Tải danh bạ khi người dùng đã đăng nhập
  useEffect(() => {
    if (isAuthenticated) {
      getUserContacts().then((data) => {
        if (Array.isArray(data)) {
          setContacts(data);
        }
      });
    } else {
      setContacts([]);
    }
  }, [isAuthenticated]);

  // Đóng suggestions khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lọc danh bạ theo text đang gõ
  const trimmedValue = value.trim();

  const matchingContacts = useMemo(() => {
    if (!trimmedValue) {
      return contacts.slice(0, 5);
    }
    return contacts.filter((c) =>
      c.name.toLowerCase().includes(trimmedValue.toLowerCase())
    );
  }, [contacts, trimmedValue]);

  // Kiểm tra tên hiện tại đã có trong danh bạ chưa
  const isExistingContact = useMemo(() => {
    if (!trimmedValue) return false;
    return contacts.some(
      (c) => c.name.toLowerCase() === trimmedValue.toLowerCase()
    );
  }, [contacts, trimmedValue]);

  const existingLowerNames = useMemo(
    () => existingNames.map((n) => n.toLowerCase()),
    [existingNames]
  );

  const handleSelectContact = (contact: ContactItem) => {
    onChange(contact.name);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleSelectNewName = () => {
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" && matchingContacts.length > 0) {
        setIsOpen(true);
        e.preventDefault();
        return;
      }
      onKeyDown?.(e);
      return;
    }

    const totalItems = matchingContacts.length + (!isExistingContact && trimmedValue ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < matchingContacts.length) {
        e.preventDefault();
        handleSelectContact(matchingContacts[selectedIndex]);
      } else if (selectedIndex === matchingContacts.length && !isExistingContact && trimmedValue) {
        e.preventDefault();
        handleSelectNewName();
      } else {
        setIsOpen(false);
        onKeyDown?.(e);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else {
      onKeyDown?.(e);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      {/* Ô Input */}
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setSelectedIndex(-1);
        }}
        onFocus={() => {
          if (isAuthenticated && contacts.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 h-9 sm:h-10 border-0 shadow-none bg-transparent focus-visible:ring-0 text-base sm:text-sm px-0 placeholder:text-slate-400 min-w-0"
      />

      {/* Dropdown Gợi ý từ Danh bạ (Hiển thị phía trên input do thanh input ở bottom) */}
      {isOpen && isAuthenticated && (matchingContacts.length > 0 || trimmedValue) && (
        <div className="absolute bottom-full mb-3 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 max-h-64 overflow-y-auto">
          {/* Header */}
          <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5">
              <BookUser className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t("contact_suggestions")}</span>
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              {contacts.length} {t("contact_book")}
            </span>
          </div>

          <div className="p-1.5 space-y-1">
            {/* Danh sách liên hệ gợi ý */}
            {matchingContacts.map((contact, idx) => {
              const isAlreadyInGroup = existingLowerNames.includes(
                contact.name.toLowerCase()
              );
              const isSelected = selectedIndex === idx;

              return (
                <button
                  key={contact.id}
                  type="button"
                  disabled={isAlreadyInGroup}
                  onClick={() => handleSelectContact(contact)}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors text-sm ${
                    isAlreadyInGroup
                      ? "opacity-50 cursor-not-allowed bg-slate-50/50"
                      : isSelected
                      ? "bg-emerald-50 text-emerald-900"
                      : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{contact.name}</p>
                      {contact.email && (
                        <p className="text-[11px] text-slate-400 truncate">
                          {contact.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {isAlreadyInGroup ? (
                    <span className="text-[11px] text-slate-400 shrink-0 font-normal ml-2">
                      {t("already_in_group")}
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-medium shrink-0 ml-2">
                      {t("select_action")}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Mục: Thêm mới [Tên] nếu tên này chưa có trong danh bạ */}
            {!isExistingContact && trimmedValue && (
              <button
                type="button"
                onClick={handleSelectNewName}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors text-sm border-t border-slate-100 ${
                  selectedIndex === matchingContacts.length
                    ? "bg-emerald-50 text-emerald-900"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-slate-500 block">
                    {t("create_member_name", { name: trimmedValue })}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
