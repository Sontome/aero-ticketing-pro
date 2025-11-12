import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, RefreshCw, Bell, Pencil } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface FlightSegment {
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  departure_time?: string;
  ticket_class: 'economy' | 'business';
}

interface MonitoredFlight {
  id: string;
  airline: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  departure_time?: string;
  is_round_trip?: boolean;
  return_date?: string;
  return_time?: string;
  segments?: FlightSegment[];
  ticket_class?: string;
  current_price: number | null;
  last_checked_at: string | null;
  check_interval_minutes: number;
  is_active: boolean;
}

// Korean airports
const KOREAN_AIRPORTS = ['ICN', 'GMP', 'PUS', 'CJU', 'TAE', 'KWJ', 'USN', 'CHN', 'RSU', 'KUV'];

// Vietnamese airports
const VIETNAMESE_AIRPORTS = ['HAN', 'SGN', 'DAD', 'CXR', 'HPH', 'HUI', 'VCA', 'VCS', 'VDO', 'VII', 'PQC', 'UIH', 'DIN', 'BMV', 'VKG'];

// All airports combined
const ALL_AIRPORTS = [...VIETNAMESE_AIRPORTS, ...KOREAN_AIRPORTS].sort();

// Generate time options in 5-minute intervals
const TIME_OPTIONS = Array.from({ length: 288 }, (_, i) => {
  const hours = Math.floor(i / 12);
  const minutes = (i % 12) * 5;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
});

// Get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split('T')[0];
};

export default function PriceMonitor() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [flights, setFlights] = useState<MonitoredFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const [editCheckInterval, setEditCheckInterval] = useState('60');
  const [checkingFlightId, setCheckingFlightId] = useState<string | null>(null);
  
  // Form state
  const [airline, setAirline] = useState<'VJ' | 'VNA'>('VJ');
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [checkInterval, setCheckInterval] = useState('60');
  
  // VNA segments state
  const [vnaSegments, setVnaSegments] = useState<FlightSegment[]>([
    { departure_airport: '', arrival_airport: '', departure_date: '', departure_time: '', ticket_class: 'economy' }
  ]);

  useEffect(() => {
    if (!profile?.perm_check_discount) {
      navigate('/');
      return;
    }
    fetchMonitoredFlights();
    
    // Refresh every second to update progress bars and time remaining
    const interval = setInterval(() => {
      setFlights(prev => [...prev]);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [profile, navigate]);

  const fetchMonitoredFlights = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('monitored_flights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map data to properly typed flights
      const typedFlights: MonitoredFlight[] = (data || []).map(flight => ({
        ...flight,
        segments: flight.segments ? (flight.segments as any as FlightSegment[]) : undefined
      }));
      
      setFlights(typedFlights);
    } catch (error) {
      console.error('Error fetching monitored flights:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách chuyến bay theo dõi',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFlight = async () => {
    const today = getTodayString();
    
    // Validate based on airline
    if (airline === 'VJ') {
      if (!departureAirport || !arrivalAirport || !departureDate) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng điền đầy đủ thông tin',
          variant: 'destructive'
        });
        return;
      }
      
      // Validate departure date is in the future
      if (departureDate <= today) {
        toast({
          title: 'Lỗi',
          description: 'Ngày đi phải lớn hơn ngày hiện tại',
          variant: 'destructive'
        });
        return;
      }
      
      if (isRoundTrip) {
        if (!returnDate) {
          toast({
            title: 'Lỗi',
            description: 'Vui lòng chọn ngày về',
            variant: 'destructive'
          });
          return;
        }
        // Validate return date is after departure date
        if (returnDate <= departureDate) {
          toast({
            title: 'Lỗi',
            description: 'Ngày về phải lớn hơn ngày đi',
            variant: 'destructive'
          });
          return;
        }
      }
    } else {
      // VNA validation
      const invalidSegment = vnaSegments.find(seg => !seg.departure_airport || !seg.arrival_airport || !seg.departure_date);
      if (invalidSegment) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng điền đầy đủ thông tin cho tất cả hành trình',
          variant: 'destructive'
        });
        return;
      }
      
      // Validate first segment date is in the future
      if (vnaSegments[0].departure_date <= today) {
        toast({
          title: 'Lỗi',
          description: 'Ngày đi phải lớn hơn ngày hiện tại',
          variant: 'destructive'
        });
        return;
      }
      
      // Validate sequential dates for multi-segment
      for (let i = 1; i < vnaSegments.length; i++) {
        if (vnaSegments[i].departure_date <= vnaSegments[i - 1].departure_date) {
          toast({
            title: 'Lỗi',
            description: `Ngày đi chặng ${i + 1} phải lớn hơn ngày đi chặng ${i}`,
            variant: 'destructive'
          });
          return;
        }
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const insertData: any = {
        user_id: user.id,
        airline,
        check_interval_minutes: parseInt(checkInterval)
      };

      if (airline === 'VJ') {
        insertData.departure_airport = departureAirport;
        insertData.arrival_airport = arrivalAirport;
        insertData.departure_date = departureDate;
        insertData.departure_time = departureTime || null;
        insertData.is_round_trip = isRoundTrip;
        insertData.return_date = isRoundTrip ? returnDate : null;
        insertData.return_time = isRoundTrip ? (returnTime || null) : null;
      } else {
        // For VNA, use segments
        insertData.segments = vnaSegments;
        insertData.departure_airport = vnaSegments[0].departure_airport;
        insertData.arrival_airport = vnaSegments[vnaSegments.length - 1].arrival_airport;
        insertData.departure_date = vnaSegments[0].departure_date;
      }

      const { error } = await supabase
        .from('monitored_flights')
        .insert(insertData);

      if (error) throw error;

      toast({
        title: 'Thành công',
        description: 'Đã thêm chuyến bay vào danh sách theo dõi'
      });

      // Reset form
      setDepartureAirport('');
      setArrivalAirport('');
      setDepartureDate('');
      setDepartureTime('');
      setIsRoundTrip(false);
      setReturnDate('');
      setReturnTime('');
      setCheckInterval('60');
      setVnaSegments([{ departure_airport: '', arrival_airport: '', departure_date: '', departure_time: '', ticket_class: 'economy' }]);
      setIsAddModalOpen(false);
      fetchMonitoredFlights();
    } catch (error) {
      console.error('Error adding flight:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể thêm chuyến bay',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('monitored_flights')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setFlights(flights.filter(f => f.id !== id));
      toast({
        title: 'Đã xóa',
        description: 'Đã xóa chuyến bay khỏi danh sách theo dõi'
      });
    } catch (error) {
      console.error('Error deleting flight:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa chuyến bay',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('monitored_flights')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      setFlights(flights.map(f => 
        f.id === id ? { ...f, is_active: !currentStatus } : f
      ));
      
      toast({
        title: !currentStatus ? 'Đã bật' : 'Đã tắt',
        description: !currentStatus ? 'Đã bật theo dõi giá' : 'Đã tắt theo dõi giá'
      });
    } catch (error) {
      console.error('Error toggling active:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái',
        variant: 'destructive'
      });
    }
  };

  const handleManualCheck = async (flightId: string) => {
    setCheckingFlightId(flightId);
    
    try {
      const { data, error } = await supabase.functions.invoke('check-flight-prices', {
        body: { flightId }
      });

      if (error) throw error;

      if (data?.results && data.results.length > 0) {
        const result = data.results[0];
        
        if (result.price_decreased) {
          toast({
            title: 'Giá vé giảm! 🎉',
            description: `Giá mới: ${result.new_price.toLocaleString()} KRW (giảm ${Math.abs(result.price_difference).toLocaleString()} KRW)`,
            className: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
          });
        } else if (result.price_increased) {
          toast({
            title: 'Giá vé tăng',
            description: `Giá mới: ${result.new_price.toLocaleString()} KRW (tăng ${result.price_difference.toLocaleString()} KRW)`,
            variant: 'destructive',
          });
        } else if (result.old_price !== null) {
          toast({
            title: 'Giá vé không đổi',
            description: `Giá hiện tại: ${result.new_price.toLocaleString()} KRW`,
          });
        } else {
          toast({
            title: 'Đã cập nhật giá',
            description: `Giá hiện tại: ${result.new_price.toLocaleString()} KRW`,
          });
        }
        
        await fetchMonitoredFlights();
      } else {
        toast({
          variant: 'destructive',
          title: 'Lỗi',
          description: 'Không tìm thấy chuyến bay phù hợp',
        });
      }
    } catch (error) {
      console.error('Error checking price:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể kiểm tra giá vé',
      });
    } finally {
      setCheckingFlightId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Chưa kiểm tra';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
  };

  const formatFlightDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const calculateProgress = (lastChecked: string | null, intervalMinutes: number) => {
    if (!lastChecked) return 0;
    const lastCheckedTime = new Date(lastChecked).getTime();
    const now = Date.now();
    const elapsed = now - lastCheckedTime;
    const intervalMs = intervalMinutes * 60 * 1000;
    const progress = (elapsed / intervalMs) * 100;
    return Math.min(progress, 100);
  };

  const getTimeUntilNextCheck = (lastChecked: string | null, intervalMinutes: number) => {
    if (!lastChecked) return 'Chưa check';
    const lastCheckedTime = new Date(lastChecked).getTime();
    const now = Date.now();
    const elapsed = now - lastCheckedTime;
    const intervalMs = intervalMinutes * 60 * 1000;
    const remaining = intervalMs - elapsed;
    
    if (remaining <= 0) return 'Sẵn sàng check';
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleUpdateInterval = async (flightId: string, newInterval: number) => {
    try {
      const { error } = await supabase
        .from('monitored_flights')
        .update({ check_interval_minutes: newInterval })
        .eq('id', flightId);

      if (error) throw error;
      
      setFlights(flights.map(f => 
        f.id === flightId ? { ...f, check_interval_minutes: newInterval } : f
      ));
      
      setEditingFlightId(null);
      toast({
        title: 'Đã cập nhật',
        description: 'Đã cập nhật tần suất kiểm tra'
      });
    } catch (error) {
      console.error('Error updating interval:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật tần suất kiểm tra',
        variant: 'destructive'
      });
    }
  };

  // Auto refresh to update progress bars
  useEffect(() => {
    const interval = setInterval(() => {
      setFlights(prev => [...prev]); // Trigger re-render for progress updates
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const generatePNR = (flightId: string) => {
    // Generate a consistent 6-character PNR from flight ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let hash = 0;
    for (let i = 0; i < flightId.length; i++) {
      hash = ((hash << 5) - hash) + flightId.charCodeAt(i);
      hash = hash & hash;
    }
    let pnr = '';
    for (let i = 0; i < 6; i++) {
      pnr += chars[Math.abs(hash >> (i * 5)) % chars.length];
    }
    return pnr;
  };

  const renderFlightSegments = (flight: MonitoredFlight) => {
    if (flight.airline === 'VNA' && flight.segments && flight.segments.length > 0) {
      return (
        <div className="text-sm">
          <strong>
            {flight.segments.length > 1 
              ? `Hành trình đa chặng (${flight.segments.length} chặng):` 
              : 'Hành trình:'}
          </strong>
          <div className="mt-2 space-y-2">
            {flight.segments.map((seg: FlightSegment, idx: number) => (
              <div key={idx} className="ml-2">
                <span className="font-medium">Chặng {idx + 1}</span>
                <div className="ml-2 text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <span>{seg.departure_airport} → {seg.arrival_airport}</span>
                    {seg.ticket_class === 'business' && <Badge variant="secondary" className="text-xs">Thương gia</Badge>}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFlightDate(seg.departure_date)}
                    {seg.departure_time && ` | ${seg.departure_time}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (flight.airline === 'VJ') {
      if (flight.is_round_trip) {
        return (
          <div className="text-sm">
            <strong>Hành trình khứ hồi (2 chặng):</strong>
            <div className="mt-2 space-y-2">
              <div className="ml-2">
                <span className="font-medium">Chặng 1</span>
                <div className="ml-2 text-gray-700 dark:text-gray-300">
                  <div>{flight.departure_airport} → {flight.arrival_airport}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFlightDate(flight.departure_date)}
                    {flight.departure_time && ` | ${flight.departure_time}`}
                  </div>
                </div>
              </div>
              <div className="ml-2">
                <span className="font-medium">Chặng 2</span>
                <div className="ml-2 text-gray-700 dark:text-gray-300">
                  <div>{flight.arrival_airport} → {flight.departure_airport}</div>
                  {flight.return_date && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFlightDate(flight.return_date)}
                      {flight.return_time && ` | ${flight.return_time}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      } else {
        return (
          <div className="text-sm">
            <strong>Hành trình:</strong>
            <div className="mt-2">
              <span className="font-medium ml-2">Chặng 1</span>
              <div className="ml-4 text-gray-700 dark:text-gray-300">
                <div>{flight.departure_airport} → {flight.arrival_airport}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFlightDate(flight.departure_date)}
                  {flight.departure_time && ` | ${flight.departure_time}`}
                </div>
              </div>
            </div>
          </div>
        );
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Quay lại
          </Button>

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-5 h-5 mr-2" />
                Thêm hành trình
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm hành trình theo dõi</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Hãng bay</Label>
                  <Select value={airline} onValueChange={(value: 'VJ' | 'VNA') => {
                    setAirline(value);
                    // Reset forms when switching airlines
                    setDepartureAirport('');
                    setArrivalAirport('');
                    setDepartureDate('');
                    setDepartureTime('');
                    setIsRoundTrip(false);
                    setReturnDate('');
                    setReturnTime('');
                    setVnaSegments([{ departure_airport: '', arrival_airport: '', departure_date: '', departure_time: '', ticket_class: 'economy' }]);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VJ">VietJet Air</SelectItem>
                      <SelectItem value="VNA">Vietnam Airlines</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {airline === 'VJ' ? (
                  <>
                    <div>
                      <Label>Sân bay đi</Label>
                      <Select value={departureAirport} onValueChange={setDepartureAirport}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn sân bay" />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_AIRPORTS.map(code => (
                            <SelectItem key={code} value={code}>{code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Sân bay đến</Label>
                      <Select value={arrivalAirport} onValueChange={setArrivalAirport}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn sân bay" />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_AIRPORTS.map(code => (
                            <SelectItem key={code} value={code}>{code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Ngày bay</Label>
                      <Input
                        type="date"
                        value={departureDate}
                        onChange={(e) => setDepartureDate(e.target.value)}
                        min={getTodayString()}
                      />
                    </div>
                    <div>
                      <Label>Giờ đi (tùy chọn)</Label>
                      <Select value={departureTime} onValueChange={setDepartureTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn giờ" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {TIME_OPTIONS.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="roundTrip"
                        checked={isRoundTrip}
                        onChange={(e) => setIsRoundTrip(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="roundTrip">Khứ hồi</Label>
                    </div>
                    {isRoundTrip && (
                      <>
                        <div>
                          <Label>Ngày về</Label>
                          <Input
                            type="date"
                            value={returnDate}
                            onChange={(e) => setReturnDate(e.target.value)}
                            min={departureDate || getTodayString()}
                          />
                        </div>
                        <div>
                          <Label>Giờ về (tùy chọn)</Label>
                          <Select value={returnTime} onValueChange={setReturnTime}>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn giờ" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {TIME_OPTIONS.map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Hành trình</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setVnaSegments([...vnaSegments, { departure_airport: '', arrival_airport: '', departure_date: '', departure_time: '', ticket_class: 'economy' }])}
                          disabled={vnaSegments.length >= 4}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Thêm chặng
                        </Button>
                      </div>
                      
                      {vnaSegments.map((segment, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-3 bg-blue-50 dark:bg-blue-950/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">Chặng {index + 1}</span>
                            {vnaSegments.length > 1 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setVnaSegments(vnaSegments.filter((_, i) => i !== index))}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Nơi đi</Label>
                              <Select 
                                value={segment.departure_airport}
                                onValueChange={(value) => {
                                  const newSegments = [...vnaSegments];
                                  newSegments[index].departure_airport = value;
                                  setVnaSegments(newSegments);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Chọn" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ALL_AIRPORTS.map(code => (
                                    <SelectItem key={code} value={code}>{code}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Nơi đến</Label>
                              <Select 
                                value={segment.arrival_airport}
                                onValueChange={(value) => {
                                  const newSegments = [...vnaSegments];
                                  newSegments[index].arrival_airport = value;
                                  setVnaSegments(newSegments);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Chọn" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ALL_AIRPORTS.map(code => (
                                    <SelectItem key={code} value={code}>{code}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Ngày đi</Label>
                              <Input
                                type="date"
                                value={segment.departure_date}
                                onChange={(e) => {
                                  const newSegments = [...vnaSegments];
                                  newSegments[index].departure_date = e.target.value;
                                  setVnaSegments(newSegments);
                                }}
                                min={index === 0 ? getTodayString() : (vnaSegments[index - 1]?.departure_date || getTodayString())}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Giờ đi (tùy chọn)</Label>
                              <Select 
                                value={segment.departure_time}
                                onValueChange={(value) => {
                                  const newSegments = [...vnaSegments];
                                  newSegments[index].departure_time = value;
                                  setVnaSegments(newSegments);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Chọn giờ" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                  {TIME_OPTIONS.map(time => (
                                    <SelectItem key={time} value={time}>{time}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Hạng vé</Label>
                            <Select 
                              value={segment.ticket_class} 
                              onValueChange={(value: 'economy' | 'business') => {
                                const newSegments = [...vnaSegments];
                                newSegments[index].ticket_class = value;
                                setVnaSegments(newSegments);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="economy">Phổ thông</SelectItem>
                                <SelectItem value="business">Thương gia</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div>
                  <Label>Kiểm tra mỗi (phút)</Label>
                  <Input
                    type="number"
                    value={checkInterval}
                    onChange={(e) => setCheckInterval(e.target.value)}
                    min="5"
                    placeholder="60"
                  />
                </div>
                <Button onClick={handleAddFlight} className="w-full">
                  Thêm vào danh sách
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
            Tool Check Vé Giảm
          </h1>

          {flights.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Chưa có chuyến bay nào trong danh sách theo dõi</p>
                <p className="text-sm text-gray-400 mt-2">Nhấn "Thêm hành trình" để bắt đầu theo dõi giá vé</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {flights.map((flight) => (
                <Card 
                  key={flight.id} 
                  className={`${
                    flight.airline === 'VNA' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                      : 'border-red-500 bg-red-50 dark:bg-red-950/20'
                  } ${!flight.is_active ? 'opacity-50' : ''}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className={`flex items-center gap-2 ${
                          flight.airline === 'VNA' 
                            ? 'text-blue-700 dark:text-blue-400' 
                            : 'text-red-700 dark:text-red-400'
                        }`}>
                          {generatePNR(flight.id)}
                          <Badge variant={flight.airline === 'VNA' ? 'default' : 'destructive'}>
                            {flight.airline}
                          </Badge>
                        </CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManualCheck(flight.id)}
                          disabled={checkingFlightId === flight.id}
                          title="Kiểm tra giá ngay"
                        >
                          <RefreshCw className={`h-4 w-4 ${checkingFlightId === flight.id ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant={flight.is_active ? 'default' : 'outline'}
                          onClick={() => handleToggleActive(flight.id, flight.is_active)}
                          title={flight.is_active ? 'Tắt theo dõi' : 'Bật theo dõi'}
                        >
                          {flight.is_active ? <Bell className="h-4 w-4" /> : <Bell className="h-4 w-4 opacity-50" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(flight.id)}
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>Giá hiện tại:</strong>
                            <p className="text-lg font-bold text-green-600">
                              {flight.current_price 
                                ? `${flight.current_price.toLocaleString('vi-VN')} KRW` 
                                : 'Chưa có dữ liệu'}
                            </p>
                          </div>
                          <div>
                            <strong>Kiểm tra lần cuối:</strong>
                            <p>{formatDate(flight.last_checked_at)}</p>
                          </div>
                          <div>
                            <strong>Tần suất check:</strong>
                            <div className="flex items-center gap-2">
                              <p>Mỗi {flight.check_interval_minutes} phút</p>
                              <Dialog 
                                open={editingFlightId === flight.id} 
                                onOpenChange={(open) => {
                                  if (open) {
                                    setEditingFlightId(flight.id);
                                    setEditCheckInterval(flight.check_interval_minutes.toString());
                                  } else {
                                    setEditingFlightId(null);
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Chỉnh sửa tần suất check</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Kiểm tra mỗi (phút)</Label>
                                      <Input
                                        type="number"
                                        value={editCheckInterval}
                                        onChange={(e) => setEditCheckInterval(e.target.value)}
                                        min="5"
                                        placeholder="60"
                                      />
                                    </div>
                                    <Button 
                                      onClick={() => handleUpdateInterval(flight.id, parseInt(editCheckInterval))} 
                                      className="w-full"
                                    >
                                      Cập nhật
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                          <div>
                            <strong>Trạng thái:</strong>
                            <Badge variant={flight.is_active ? 'default' : 'secondary'}>
                              {flight.is_active ? 'Đang theo dõi' : 'Tạm dừng'}
                            </Badge>
                          </div>
                        </div>

                        {/* Progress bar for next check */}
                        {flight.is_active && (
                          <div className="mt-4 space-y-1">
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>Thời gian đến lần check tiếp theo:</span>
                              <span className="font-medium">{getTimeUntilNextCheck(flight.last_checked_at, flight.check_interval_minutes)}</span>
                            </div>
                            <Progress value={calculateProgress(flight.last_checked_at, flight.check_interval_minutes)} className="h-2" />
                          </div>
                        )}
                        
                        {/* Flight segments */}
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          {renderFlightSegments(flight)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
