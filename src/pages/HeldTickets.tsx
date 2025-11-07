import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, Trash2 } from 'lucide-react';
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

  useEffect(() => {
    if (!profile?.perm_hold_ticket) {
      navigate('/');
      return;
    }
    fetchHeldTickets();
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
    return new Date(expireDate) < new Date();
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
              {tickets.map((ticket) => (
                <Card key={ticket.id} className={isExpired(ticket.expire_date) ? 'border-red-300 bg-red-50' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
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
                        <Badge variant={isExpired(ticket.expire_date) ? 'destructive' : 'default'}>
                          {ticket.status === 'holding' ? 'Đang giữ' : ticket.status}
                        </Badge>
                        {isExpired(ticket.expire_date) && (
                          <Badge variant="destructive">Hết hạn</Badge>
                        )}
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <div className="text-sm space-y-1">
                          <p><strong>Hạn thanh toán:</strong> {ticket.flight_details?.deadline || formatDate(ticket.expire_date)}</p>
                          <p><strong>Loại vé:</strong> {ticket.flight_details?.tripType === 'RT' ? 'Khứ hồi' : 'Một chiều'}</p>
                          <p><strong>Sân bay đi:</strong> {ticket.flight_details?.departureAirport}</p>
                          {ticket.flight_details?.passengers && (
                            <p><strong>Số hành khách:</strong> {ticket.flight_details.passengers.length}</p>
                          )}
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
