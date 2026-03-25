import { useState, useEffect } from 'react';
import { Settings, LogOut, DollarSign, Package, ShoppingCart, Users, GraduationCap, BarChart3 } from 'lucide-react';
import { Button } from './ui/button';
import { useCurrency } from '../contexts/CurrencyContext';
import type { CurrencyCode } from '../contexts/CurrencyContext';

interface TopBarProps {
  currentPage: 'cashier' | 'inventory' | 'budget' | 'statistics' | 'students' | 'grades';
  onNavigate: (page: 'cashier' | 'inventory' | 'budget' | 'statistics' | 'students' | 'grades') => void;
  onLogout?: () => void;
}

export function TopBar({ currentPage, onNavigate, onLogout }: TopBarProps) {
  const { currency, setCurrency } = useCurrency();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const navItems = [
    { id: 'cashier' as const, label: 'Cashier', icon: ShoppingCart },
    { id: 'inventory' as const, label: 'Inventory', icon: Package },
    { id: 'budget' as const, label: 'Budget', icon: DollarSign },
    { id: 'statistics' as const, label: 'Statistic', icon: BarChart3 },
    { id: 'students' as const, label: 'Students', icon: Users },
    { id: 'grades' as const, label: 'Customers', icon: GraduationCap }
  ];

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="h-[70px] px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-gray-900">School Store System</div>
            <div className="text-gray-500 text-sm">Cashier: John Smith</div>
          </div>
          <div className="text-gray-600 text-sm">
            {formatTime(currentTime)} • {formatDate(currentTime)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentPage === item.id ? 'default' : 'ghost'}
                onClick={() => onNavigate(item.id)}
                className="gap-2"
              >
                <Icon className="size-4" />
                {item.label}
              </Button>
            );
          })}
          
          <div className="w-px h-6 bg-gray-300 mx-2" />

          <select
            className="border rounded px-2 py-1.5 text-sm text-gray-700 bg-white"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
          >
            <option value="KRW">₩ KRW</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>
          
          <Button variant="ghost" size="sm">
            <Settings className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout} title="Log out">
            <LogOut className="size-4" />
          </Button>
          {/* Reset DB button removed per request */}
        </div>
      </div>
    </div>
  );
}
