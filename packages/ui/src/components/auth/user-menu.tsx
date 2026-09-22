"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@subboost/ui/components/ui/button";
import { SafeImage } from "@subboost/ui/components/ui/safe-image";
import { captureAuthConfigHandoff } from "@subboost/ui/store/config-store/auth-handoff";
import { useConfigStore } from "@subboost/ui/store/config-store";
import { useUserStore } from "@subboost/ui/store/user-store";
import {
  LogIn,
  LogOut,
  User as UserIcon,
  Settings,
  LayoutDashboard,
  ChevronDown,
  Shield,
} from "lucide-react";

export type AccountMenuItem = {
  href: string;
  label: string;
};

export function UserMenu({
  privilegedMenuItem,
  minimal = false,
  hideAvatar = false,
}: {
  privilegedMenuItem?: AccountMenuItem;
  minimal?: boolean;
  hideAvatar?: boolean;
}) {
  const { user, isLoading: userLoading, fetchUser, logout: userLogout } = useUserStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (user) await userLogout();
    setIsOpen(false);
    window.location.href = "/";
  };

  const isLoading = userLoading && !user;

  if (isLoading) {
    return (
      <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
    );
  }

  // 未登录
  if (!user) {
    return (
      <Link href="/login" onClick={() => captureAuthConfigHandoff(useConfigStore.getState())}>
        <Button size="sm" className="gap-2">
          <LogIn className="h-4 w-4" />
          登录
        </Button>
      </Link>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-neutral-800 hover:bg-neutral-100 transition-colors"
      >
        {!hideAvatar && <SafeImage
          src={user.avatarUrl}
          alt={user.name || user.username}
          className="h-8 w-8 rounded-full border border-neutral-200"
          fallback={
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-white" />
            </div>
          }
        />}
        <span className="text-sm font-medium hidden sm:block">{user.name || user.username}</span>
        <ChevronDown className={`h-4 w-4 text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 rounded-md border border-neutral-200 bg-white py-1 shadow-lg z-50">
            {/* User Info Header */}
            {!minimal && <div className="px-4 py-3 border-b border-neutral-200">
              <div className="flex items-center gap-3">
                <SafeImage
                  src={user.avatarUrl}
                  alt={user.name || user.username}
                  className="h-12 w-12 rounded-full border border-white/20"
                  fallback={
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-white" />
                    </div>
                  }
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name || user.username}</p>
                  <p className="text-xs text-white/40 truncate">@{user.username}</p>
                </div>
              </div>
            </div>}

            {/* Menu Items */}
              {!minimal && <div className="flex items-center gap-2 mt-3 flex-wrap">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-xs text-indigo-400">
                  <Shield className="h-3 w-3" /><span>Lv.{user.trustLevel}</span>
                </div>
                {user.isAdmin && !user.isBanned && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-xs text-indigo-400">
                    <Shield className="h-3 w-3" /><span>管理员</span>
                  </div>
                )}
                <div className="text-xs text-white/40">{user.subscriptionCount}/{user.quota.maxSubscriptions} 订阅</div>
              </div>}
              {!minimal && <div className="py-1">
              {privilegedMenuItem && user.isAdmin && !user.isBanned && (
                <Link
                  href={privilegedMenuItem.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-indigo-400/80 hover:bg-white/5 hover:text-indigo-400 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  {privilegedMenuItem.label}
                </Link>
              )}
              {!minimal && <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                我的订阅
              </Link>}
            </div>}

            {/* Logout */}
            <div className={minimal ? "" : "border-t border-neutral-200 pt-1"}>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
