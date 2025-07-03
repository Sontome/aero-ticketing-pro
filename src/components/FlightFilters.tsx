
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FilterOptions {
  airlines: string[];
  showCheapestOnly: boolean;
  sortBy: 'price' | 'duration' | 'departure';
}

interface FlightFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

export const FlightFilters: React.FC<FlightFiltersProps> = ({ filters, onFiltersChange }) => {
  const handleAirlineChange = (airline: string, checked: boolean) => {
    const newAirlines = checked 
      ? [...filters.airlines, airline]
      : filters.airlines.filter(a => a !== airline);
    
    onFiltersChange({
      ...filters,
      airlines: newAirlines
    });
  };

  const handleCheapestOnlyChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      showCheapestOnly: checked
    });
  };

  const handleSortChange = (sortBy: 'price' | 'duration' | 'departure') => {
    onFiltersChange({
      ...filters,
      sortBy
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Bộ lọc</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cheapest Only Filter */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Tùy chọn hiển thị</Label>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cheapest-only"
              checked={filters.showCheapestOnly}
              onCheckedChange={handleCheapestOnlyChange}
            />
            <Label htmlFor="cheapest-only" className="text-sm">
              Chỉ hiển thị vé rẻ nhất (VJ & VNA)
            </Label>
          </div>
        </div>

        {/* Airlines Filter */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Hãng hàng không</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="vj"
                checked={filters.airlines.includes('VJ')}
                onCheckedChange={(checked) => handleAirlineChange('VJ', checked as boolean)}
              />
              <Label htmlFor="vj" className="text-sm">VietJet Air</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="vna"
                checked={filters.airlines.includes('VNA')}
                onCheckedChange={(checked) => handleAirlineChange('VNA', checked as boolean)}
              />
              <Label htmlFor="vna" className="text-sm">Vietnam Airlines</Label>
            </div>
          </div>
        </div>

        {/* Sort Options */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Sắp xếp theo</Label>
          <Select value={filters.sortBy} onValueChange={handleSortChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price">Giá thấp nhất</SelectItem>
              <SelectItem value="duration">Thời gian bay</SelectItem>
              <SelectItem value="departure">Giờ khởi hành</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
