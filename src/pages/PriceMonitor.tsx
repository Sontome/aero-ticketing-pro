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
import { ArrowLeft, Plus, Trash2, RefreshCw, Bell } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface MonitoredFlight {
  id: string;
  airline: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  current_price: number | null;
  last_checked_at: string | null;
  check_interval_minutes: number;
  is_active: boolean;
}

export default function PriceMonitor() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [flights, setFlights] = useState<MonitoredFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Form state
  const [airline, setAirline] = useState<'VJ' | 'VNA'>('VJ');
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [checkInterval, setCheckInterval] = useState('60');

  useEffect(() => {
    if (!profile?.perm_check_discount) {
      navigate('/');
      return;
    }
    fetchMonitoredFlights();
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
      setFlights(data || []);
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
    if (!departureAirport || !arrivalAirport || !departureDate) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('monitored_flights')
        .insert({
          user_id: user.id,
          airline,
          departure_airport: departureAirport,
          arrival_airport: arrivalAirport,
          departure_date: departureDate,
          check_interval_minutes: parseInt(checkInterval)
        });

      if (error) throw error;

      toast({
        title: 'Thành công',
        description: 'Đã thêm chuyến bay vào danh sách theo dõi'
      });

      // Reset form
      setDepartureAirport('');
      setArrivalAirport('');
      setDepartureDate('');
      setCheckInterval('60');
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Chưa kiểm tra';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
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
                  <Select value={airline} onValueChange={(value: 'VJ' | 'VNA') => setAirline(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VJ">VietJet Air</SelectItem>
                      <SelectItem value="VNA">Vietnam Airlines</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sân bay đi</Label>
                  <Input
                    value={departureAirport}
                    onChange={(e) => setDepartureAirport(e.target.value.toUpperCase())}
                    placeholder="Ví dụ: HAN"
                    maxLength={3}
                  />
                </div>
                <div>
                  <Label>Sân bay đến</Label>
                  <Input
                    value={arrivalAirport}
                    onChange={(e) => setArrivalAirport(e.target.value.toUpperCase())}
                    placeholder="Ví dụ: SGN"
                    maxLength={3}
                  />
                </div>
                <div>
                  <Label>Ngày bay</Label>
                  <Input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                  />
                </div>
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
                          {flight.departure_airport} → {flight.arrival_airport}
                          <Badge variant={flight.airline === 'VNA' ? 'default' : 'destructive'}>
                            {flight.airline}
                          </Badge>
                        </CardTitle>
                        <div className="text-sm text-gray-500">
                          Ngày bay: {flight.departure_date}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={flight.is_active ? 'default' : 'outline'}
                          onClick={() => handleToggleActive(flight.id, flight.is_active)}
                        >
                          {flight.is_active ? <Bell className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(flight.id)}
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
                                ? `${flight.current_price.toLocaleString('vi-VN')} VNĐ` 
                                : 'Chưa có dữ liệu'}
                            </p>
                          </div>
                          <div>
                            <strong>Kiểm tra lần cuối:</strong>
                            <p>{formatDate(flight.last_checked_at)}</p>
                          </div>
                          <div>
                            <strong>Tần suất check:</strong>
                            <p>Mỗi {flight.check_interval_minutes} phút</p>
                          </div>
                          <div>
                            <strong>Trạng thái:</strong>
                            <Badge variant={flight.is_active ? 'default' : 'secondary'}>
                              {flight.is_active ? 'Đang theo dõi' : 'Tạm dừng'}
                            </Badge>
                          </div>
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
