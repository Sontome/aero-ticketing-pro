import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, Trash2, TrendingDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface HeldTicket {
  id: string;
  pnr: string;
  flight_details: any;
  hold_date: string;
  expire_date: string;
  status: string;
}

export default function HeldTickets() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<HeldTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [monitoredPNRs, setMonitoredPNRs] = useState<Set<string>>(new Set());
  const [addingToMonitor, setAddingToMonitor] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.perm_hold_ticket) {
      navigate('/');
      return;
    }
    fetchHeldTickets();
    fetchMonitoredPNRs();
  }, [profile, navigate]);

  const fetchHeldTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('held_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('hold_date', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching held tickets:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách vé giữ',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMonitoredPNRs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('monitored_flights')
        .select('booking_key_departure')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const pnrSet = new Set<string>();
      data?.forEach(flight => {
        if (flight.booking_key_departure) {
          pnrSet.add(flight.booking_key_departure);
        }
      });
      setMonitoredPNRs(pnrSet);
    } catch (error) {
      console.error('Error fetching monitored PNRs:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('held_tickets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setTickets(tickets.filter(t => t.id !== id));
      toast({
        title: 'Đã xóa',
        description: 'Đã xóa vé khỏi giỏ hàng'
      });
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa vé',
        variant: 'destructive'
      });
    }
  };

  const copyPNR = (pnr: string) => {
    navigator.clipboard.writeText(pnr);
    toast({
      title: 'Đã copy',
      description: `Đã copy mã PNR: ${pnr}`
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
  };

  const isExpired = (expireDate: string) => {
    if (!expireDate) return false;
    return new Date(expireDate) < new Date();
  };

  const isVNA = (ticket: HeldTicket) => {
    return ticket.flight_details?.airline === 'VNA';
  };

  const parseDate = (dateStr: string): string => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
  };

  const handleAddToMonitor = async (pnr: string) => {
    if (monitoredPNRs.has(pnr)) {
      toast({
        title: 'Thông báo',
        description: 'PNR này đã được thêm vào danh sách theo dõi',
        variant: 'default'
      });
      return;
    }

    setAddingToMonitor(pnr);
    try {
      const response = await fetch(`https://thuhongtour.com/vj/checkpnr?pnr=${pnr}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json'
        },
        body: ''
      });

      if (!response.ok) {
        throw new Error('Failed to fetch PNR data');
      }

      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error('PNR data invalid');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const flightData: any = {
        user_id: user.id,
        airline: "VJ",
        departure_airport: data.chieudi.departure,
        arrival_airport: data.chieudi.arrival,
        departure_date: parseDate(data.chieudi.ngaycatcanh),
        departure_time: data.chieudi.giocatcanh,
        check_interval_minutes: 5,
        is_active: true,
        ticket_class: data.chieudi.loaive === "ECO" ? "economy" : "business",
        booking_key_departure: pnr,
      };

      if (data.chieuve) {
        flightData.is_round_trip = true;
        flightData.return_date = parseDate(data.chieuve.ngaycatcanh);
        flightData.return_time = data.chieuve.giocatcanh;
      }

      const { error } = await supabase
        .from("monitored_flights")
        .insert(flightData);

      if (error) throw error;

      toast({
        title: "Đã thêm vào theo dõi giá! 🎯",
        description: `PNR ${pnr}: ${data.chieudi.departure} → ${data.chieudi.arrival}`,
      });

      setMonitoredPNRs(prev => new Set([...prev, pnr]));
    } catch (error) {
      console.error('Error adding to monitor:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể thêm vào danh sách theo dõi giá',
        variant: 'destructive'
      });
    } finally {
      setAddingToMonitor(null);
    }
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
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Quay lại
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Giỏ hàng - Vé đang giữ</h1>

          {tickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">Chưa có vé nào trong giỏ hàng</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => {
                const expired = isExpired(ticket.expire_date);
                const vnaTicket = isVNA(ticket);
                const isVJExpired = !vnaTicket && expired;
                
                return (
                <Card key={ticket.id} className={`${isVJExpired ? 'opacity-50 grayscale' : ''} ${
                  vnaTicket 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                    : 'border-red-500 bg-red-50 dark:bg-red-950/20'
                }`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className={`flex items-center gap-2 ${
                          vnaTicket ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'
                        }`}>
                          Mã PNR: {ticket.pnr}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyPNR(ticket.pnr)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </CardTitle>
                        <div className="text-sm text-gray-500">
                          Giữ lúc: {formatDate(ticket.hold_date)}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(ticket.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={isVJExpired ? 'destructive' : 'default'}>
                          {ticket.status === 'holding' ? 'Đang giữ' : ticket.status}
                        </Badge>
                        {isVJExpired && (
                          <Badge variant="destructive">Hết hạn</Badge>
                        )}
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <div className="text-sm space-y-1">
                          {!vnaTicket && (
                            <p><strong>Hạn thanh toán:</strong> {ticket.flight_details?.deadline || formatDate(ticket.expire_date)}</p>
                          )}
                          <p><strong>Loại vé:</strong> {ticket.flight_details?.tripType === 'RT' ? 'Khứ hồi' : 'Một chiều'}</p>
                          <p><strong>Sân bay đi:</strong> {ticket.flight_details?.departureAirport}</p>
                          {ticket.flight_details?.passengers && (
                            <p><strong>Số hành khách:</strong> {ticket.flight_details.passengers.length}</p>
                          )}
                        </div>
                      </div>

                      {!vnaTicket && !expired && (
                        <Button
                          onClick={() => handleAddToMonitor(ticket.pnr)}
                          disabled={monitoredPNRs.has(ticket.pnr) || addingToMonitor === ticket.pnr}
                          className={`w-full ${
                            monitoredPNRs.has(ticket.pnr) 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          <TrendingDown className="w-4 h-4 mr-2" />
                          {addingToMonitor === ticket.pnr 
                            ? 'Đang xử lý...' 
                            : monitoredPNRs.has(ticket.pnr) 
                              ? 'Đã theo dõi' 
                              : 'Theo dõi giá giảm'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
