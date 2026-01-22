import { ShoppingCart, Package, Users, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';

interface NavigationProps {
  currentPage: 'cashier' | 'inventory' | 'students' | 'reports';
  onNavigate: (page: 'cashier' | 'inventory' | 'students' | 'reports') => void;
}

const navItems = [
  { id: 'cashier' as const, label: 'Cashier', icon: ShoppingCart },
  { id: 'inventory' as const, label: 'Inventory', icon: Package },
  { id: 'students' as const, label: 'Students', icon: Users },
  { id: 'reports' as const, label: 'Reports', icon: TrendingUp }
];

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-gray-900">School Store Management</h1>
        </div>
        
        <nav className="flex gap-2">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentPage === item.id ? 'default' : 'outline'}
                onClick={() => onNavigate(item.id)}
                className="gap-2"
              >
                <Icon className="size-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
