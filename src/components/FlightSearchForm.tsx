
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plane } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface SearchFormData {
  from: string;
  to: string;
  departureDate: Date | undefined;
  returnDate: Date | undefined;
  passengers: number;
  tripType: 'one_way' | 'round_trip';
}

interface FlightSearchFormProps {
  onSearch: (data: SearchFormData) => void;
  loading: boolean;
}

// Reordered airports with Korean airports at top
const airports = [
  { code: 'ICN', name: 'Seoul Incheon', city: 'Seoul' },
  { code: 'PUS', name: 'Busan', city: 'Busan' },
  { code: 'HAN', name: 'Hà Nội', city: 'Hà Nội' },
  { code: 'SGN', name: 'TP.HCM', city: 'TP.HCM' },
  { code: 'DAD', name: 'Đà Nẵng', city: 'Đà Nẵng' },
  { code: 'CXR', name: 'Nha Trang', city: 'Nha Trang' },
  { code: 'DLI', name: 'Đà Lạt', city: 'Đà Lạt' },
  { code: 'PQC', name: 'Phú Quốc', city: 'Phú Quốc' },
  { code: 'VCA', name: 'Cần Thơ', city: 'Cần Thơ' },
  { code: 'HPH', name: 'Hải Phòng', city: 'Hải Phòng' },
  { code: 'GMP', name: 'Seoul Gimpo', city: 'Seoul' },
];

export const FlightSearchForm: React.FC<FlightSearchFormProps> = ({ onSearch, loading }) => {
  const [formData, setFormData] = useState<SearchFormData>({
    from: 'ICN', // Default to ICN
    to: 'HAN', // Default to HAN
    departureDate: undefined,
    returnDate: undefined,
    passengers: 1,
    tripType: 'round_trip', // Default to round trip
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(formData);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Trip Type Selector */}
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="tripType"
              value="round_trip"
              checked={formData.tripType === 'round_trip'}
              onChange={(e) => setFormData(prev => ({ ...prev, tripType: e.target.value as 'round_trip' }))}
              className="text-blue-600"
            />
            <span className="text-gray-700 dark:text-gray-300">Khứ hồi</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="tripType"
              value="one_way"
              checked={formData.tripType === 'one_way'}
              onChange={(e) => setFormData(prev => ({ ...prev, tripType: e.target.value as 'one_way' }))}
              className="text-blue-600"
            />
            <span className="text-gray-700 dark:text-gray-300">Một chiều</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* From Airport */}
          <div className="space-y-2">
            <Label htmlFor="from">Nơi đi</Label>
            <Select value={formData.from} onValueChange={(value) => setFormData(prev => ({ ...prev, from: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn sân bay đi" />
              </SelectTrigger>
              <SelectContent>
                {airports.map((airport) => (
                  <SelectItem key={airport.code} value={airport.code}>
                    {airport.code} - {airport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To Airport */}
          <div className="space-y-2">
            <Label htmlFor="to">Nơi đến</Label>
            <Select value={formData.to} onValueChange={(value) => setFormData(prev => ({ ...prev, to: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn sân bay đến" />
              </SelectTrigger>
              <SelectContent>
                {airports.map((airport) => (
                  <SelectItem key={airport.code} value={airport.code}>
                    {airport.code} - {airport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Departure Date */}
          <div className="space-y-2">
            <Label>Ngày đi</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.departureDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.departureDate ? (
                    format(formData.departureDate, "dd/MM/yyyy")
                  ) : (
                    <span>Chọn ngày</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.departureDate}
                  onSelect={(date) => setFormData(prev => ({ ...prev, departureDate: date }))}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Return Date */}
          {formData.tripType === 'round_trip' && (
            <div className="space-y-2">
              <Label>Ngày về</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.returnDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.returnDate ? (
                      format(formData.returnDate, "dd/MM/yyyy")
                    ) : (
                      <span>Chọn ngày</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.returnDate}
                    onSelect={(date) => setFormData(prev => ({ ...prev, returnDate: date }))}
                    disabled={(date) => date < (formData.departureDate || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Passengers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="passengers">Số hành khách</Label>
            <Input
              id="passengers"
              type="number"
              min="1"
              max="9"
              value={formData.passengers}
              onChange={(e) => setFormData(prev => ({ ...prev, passengers: parseInt(e.target.value) || 1 }))}
              className="w-full"
            />
          </div>
        </div>

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
          <Plane className="mr-2 h-4 w-4" />
          {loading ? 'Đang tìm kiếm...' : 'Tìm chuyến bay'}
        </Button>
      </form>
    </div>
  );
};
