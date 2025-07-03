
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut } from 'lucide-react';

export const UserProfileDropdown = () => {
  const { profile, signOut } = useAuth();

  const formatPriceMarkup = (markup: number | null) => {
    if (!markup || markup === 0) return '0W';
    return new Intl.NumberFormat('ko-KR').format(markup) + 'W';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="transition-all duration-200 hover:scale-105">
          <User className="w-4 h-4 mr-2" />
          {profile?.full_name || profile?.email}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-64 transition-all duration-200 animate-fade-in"
      >
        <DropdownMenuLabel className="transition-colors duration-200">
          Thông tin tài khoản
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="transition-colors duration-200">
          <div className="flex flex-col space-y-1">
            <span className="text-sm font-medium">
              {profile?.full_name || 'Chưa có tên'}
            </span>
            <span className="text-xs text-gray-500">
              {profile?.email}
            </span>
            <span className="text-xs text-blue-600 font-semibold">
              Phí chung: {formatPriceMarkup(profile?.price_markup)}
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={signOut}
          className="transition-all duration-200 hover:bg-red-50 focus:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
