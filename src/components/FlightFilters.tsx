
import { useState } from 'react';
import { Filter, Clock, DollarSign, Plane } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface FilterOptions {
  airlines: string[];
  priceRange: [number, number];
  timeRanges: {
    departure: string[];
    arrival: string[];
  };
  stops: string[];
}

interface FlightFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  maxPrice: number;
}

export const FlightFilters = ({ filters, onFiltersChange, maxPrice }: FlightFiltersProps) => {
  const timeSlots = [
    { id: 'early_morning', label: 'Sáng sớm (00:00 - 06:00)', icon: '🌅' },
    { id: 'morning', label: 'Buổi sáng (06:00 - 12:00)', icon: '☀️' },
    { id: 'afternoon', label: 'Buổi chiều (12:00 - 18:00)', icon: '🌤️' },
    { id: 'evening', label: 'Buổi tối (18:00 - 24:00)', icon: '🌙' },
  ];

  const airlines = [
    { id: 'VJ', label: 'VietJet Air', color: 'text-green-600' },
    { id: 'VNA', label: 'Vietnam Airlines', color: 'text-blue-600' },
  ];

  const handleAirlineChange = (airlineId: string, checked: boolean) => {
    const newAirlines = checked
      ? [...filters.airlines, airlineId]
      : filters.airlines.filter(id => id !== airlineId);
    
    onFiltersChange({
      ...filters,
      airlines: newAirlines,
    });
  };

  const handleTimeRangeChange = (type: 'departure' | 'arrival', timeId: string, checked: boolean) => {
    const currentTimes = filters.timeRanges[type];
    const newTimes = checked
      ? [...currentTimes, timeId]
      : currentTimes.filter(id => id !== timeId);
    
    onFiltersChange({
      ...filters,
      timeRanges: {
        ...filters.timeRanges,
        [type]: newTimes,
      },
    });
  };

  const handlePriceRangeChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      priceRange: [value[0], value[1]],
    });
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Filter className="w-5 h-5 mr-2" />
          Bộ lọc tìm kiếm
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Price Range Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center">
            <DollarSign className="w-4 h-4 mr-1" />
            Khoảng giá
          </Label>
          <div className="px-2">
            <Slider
              value={filters.priceRange}
              onValueChange={handlePriceRangeChange}
              max={maxPrice}
              min={0}
              step={100000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{filters.priceRange[0].toLocaleString('vi-VN')} VND</span>
              <span>{filters.priceRange[1].toLocaleString('vi-VN')} VND</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Airlines Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center">
            <Plane className="w-4 h-4 mr-1" />
            Hãng hàng không
          </Label>
          <div className="space-y-2">
            {airlines.map((airline) => (
              <div key={airline.id} className="flex items-center space-x-2">
                <Checkbox
                  id={airline.id}
                  checked={filters.airlines.includes(airline.id)}
                  onCheckedChange={(checked) => handleAirlineChange(airline.id, checked as boolean)}
                />
                <Label
                  htmlFor={airline.id}
                  className={`text-sm cursor-pointer ${airline.color}`}
                >
                  {airline.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Departure Time Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            Giờ khởi hành
          </Label>
          <div className="space-y-2">
            {timeSlots.map((slot) => (
              <div key={slot.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`dep-${slot.id}`}
                  checked={filters.timeRanges.departure.includes(slot.id)}
                  onCheckedChange={(checked) => handleTimeRangeChange('departure', slot.id, checked as boolean)}
                />
                <Label htmlFor={`dep-${slot.id}`} className="text-sm cursor-pointer">
                  <span className="mr-2">{slot.icon}</span>
                  {slot.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Arrival Time Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            Giờ đến
          </Label>
          <div className="space-y-2">
            {timeSlots.map((slot) => (
              <div key={slot.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`arr-${slot.id}`}
                  checked={filters.timeRanges.arrival.includes(slot.id)}
                  onCheckedChange={(checked) => handleTimeRangeChange('arrival', slot.id, checked as boolean)}
                />
                <Label htmlFor={`arr-${slot.id}`} className="text-sm cursor-pointer">
                  <span className="mr-2">{slot.icon}</span>
                  {slot.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
