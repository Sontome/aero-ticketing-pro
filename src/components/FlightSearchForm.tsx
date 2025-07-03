
import { useState } from 'react';
import { Calendar, MapPin, Users, ArrowRightLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface SearchFormData {
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

const airports = [
  { code: 'HAN', name: 'Hà Nội', fullName: 'Hà Nội (HAN)' },
  { code: 'SGN', name: 'TP.HCM', fullName: 'TP. Hồ Chí Minh (SGN)' },
  { code: 'DAD', name: 'Đà Nẵng', fullName: 'Đà Nẵng (DAD)' },
  { code: 'CXR', name: 'Nha Trang', fullName: 'Nha Trang (CXR)' },
  { code: 'DLI', name: 'Đà Lạt', fullName: 'Đà Lạt (DLI)' },
  { code: 'PQC', name: 'Phú Quốc', fullName: 'Phú Quốc (PQC)' },
  { code: 'VCA', name: 'Cần Thơ', fullName: 'Cần Thơ (VCA)' },
  { code: 'HPH', name: 'Hải Phòng', fullName: 'Hải Phòng (HPH)' },
  { code: 'ICN', name: 'Seoul Incheon', fullName: 'Seoul Incheon (ICN)' },
  { code: 'GMP', name: 'Seoul Gimpo', fullName: 'Seoul Gimpo (GMP)' },
  { code: 'PUS', name: 'Busan', fullName: 'Busan (PUS)' },
];

export const FlightSearchForm = ({ onSearch, loading }: FlightSearchFormProps) => {
  const [formData, setFormData] = useState<SearchFormData>({
    from: '',
    to: '',
    departureDate: undefined,
    returnDate: undefined,
    passengers: 1,
    tripType: 'round_trip', // Changed default to round trip
  });

  const [showReturnCalendar, setShowReturnCalendar] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.from && formData.to && formData.departureDate) {
      onSearch(formData);
    }
  };

  const swapCities = () => {
    setFormData(prev => ({
      ...prev,
      from: prev.to,
      to: prev.from,
    }));
  };

  const handleDepartureDateSelect = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, departureDate: date }));
    if (date && formData.tripType === 'round_trip') {
      setShowReturnCalendar(true);
    }
  };

  return (
    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/20">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs
          value={formData.tripType}
          onValueChange={(value) => setFormData(prev => ({ ...prev, tripType: value as 'one_way' | 'round_trip' }))}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="one_way">Một chiều</TabsTrigger>
            <TabsTrigger value="round_trip">Khứ hồi</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* From City */}
            <div className="space-y-2 lg:col-span-1">
              <Label htmlFor="from" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                <MapPin className="inline w-4 h-4 mr-1" />
                Từ
              </Label>
              <Select value={formData.from} onValueChange={(value) => setFormData(prev => ({ ...prev, from: value }))}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Chọn điểm đi" />
                </SelectTrigger>
                <SelectContent>
                  {airports.map((airport) => (
                    <SelectItem key={airport.code} value={airport.code}>
                      {airport.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Swap Button */}
            <div className="flex items-end justify-center lg:col-span-0">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={swapCities}
                className="h-12 w-12 rounded-full border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
              >
                <ArrowRightLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </Button>
            </div>

            {/* To City */}
            <div className="space-y-2 lg:col-span-1">
              <Label htmlFor="to" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                <MapPin className="inline w-4 h-4 mr-1" />
                Đến
              </Label>
              <Select value={formData.to} onValueChange={(value) => setFormData(prev => ({ ...prev, to: value }))}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Chọn điểm đến" />
                </SelectTrigger>
                <SelectContent>
                  {airports.map((airport) => (
                    <SelectItem key={airport.code} value={airport.code}>
                      {airport.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Departure Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                <Calendar className="inline w-4 h-4 mr-1" />
                Ngày đi
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-12 w-full justify-start text-left font-normal"
                  >
                    {formData.departureDate ? (
                      format(formData.departureDate, 'dd/MM/yyyy', { locale: vi })
                    ) : (
                      <span className="text-muted-foreground">Chọn ngày</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.departureDate}
                    onSelect={handleDepartureDateSelect}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Return Date */}
            <TabsContent value="round_trip" className="space-y-2 mt-0">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                <Calendar className="inline w-4 h-4 mr-1" />
                Ngày về
              </Label>
              <Popover open={showReturnCalendar} onOpenChange={setShowReturnCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-12 w-full justify-start text-left font-normal"
                  >
                    {formData.returnDate ? (
                      format(formData.returnDate, 'dd/MM/yyyy', { locale: vi })
                    ) : (
                      <span className="text-muted-foreground">Chọn ngày về</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.returnDate}
                    onSelect={(date) => {
                      setFormData(prev => ({ ...prev, returnDate: date }));
                      setShowReturnCalendar(false);
                    }}
                    disabled={(date) => date < (formData.departureDate || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </TabsContent>
          </div>

          {/* Passengers */}
          <div className="flex items-center space-x-4">
            <div className="space-y-2 flex-1 max-w-xs">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                <Users className="inline w-4 h-4 mr-1" />
                Số hành khách
              </Label>
              <Select
                value={formData.passengers.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, passengers: parseInt(value) }))}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} người
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={loading || !formData.from || !formData.to || !formData.departureDate}
              className="h-12 px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang tìm...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Tìm chuyến bay
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  );
};
