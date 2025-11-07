import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PassengerInfo {
  Họ: string;
  Tên: string;
  Giới_tính: 'nam' | 'nữ';
  type: 'người_lớn' | 'trẻ_em';
}

interface VNABookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  flightInfo: {
    dep: string;
    arr: string;
    depdate: string;
    deptime: string;
    arrdate?: string;
    arrtime?: string;
    tripType: 'OW' | 'RT';
  };
  maxSeats: number;
  onBookingSuccess?: (pnr: string) => void;
}

export const VNABookingModal = ({
  isOpen,
  onClose,
  flightInfo,
  maxSeats,
  onBookingSuccess
}: VNABookingModalProps) => {
  const [passengers, setPassengers] = useState<PassengerInfo[]>([
    {
      Họ: '',
      Tên: '',
      Giới_tính: 'nam',
      type: 'người_lớn'
    }
  ]);
  const [doiTuong, setDoiTuong] = useState<'VFR' | 'ADT' | 'STU'>('VFR');
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ pnr: string } | null>(null);

  // Remove Vietnamese diacritics
  const removeVietnameseDiacritics = (str: string) => {
    const vietnameseMap: { [key: string]: string } = {
      'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
      'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
      'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
      'đ': 'd',
      'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
      'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
      'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
      'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
      'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
      'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
      'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
      'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
      'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
      'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
      'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
      'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
      'Đ': 'D',
      'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
      'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
      'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
      'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
      'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
      'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
      'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
      'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
      'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y'
    };
    return str.split('').map(char => vietnameseMap[char] || char).join('');
  };

  const formatNameForAPI = (ho: string, ten: string, gioiTinh: 'nam' | 'nữ', type: 'người_lớn' | 'trẻ_em') => {
    const lastName = removeVietnameseDiacritics(ho.trim()).toUpperCase();
    const firstName = removeVietnameseDiacritics(ten.trim()).toUpperCase().replace(/\s+/g, ' ');
    const gender = type === 'trẻ_em' 
      ? (gioiTinh === 'nam' ? 'MSTR' : 'MISS')
      : (gioiTinh === 'nam' ? 'MR' : 'MS');
    const ageType = type === 'người_lớn' ? 'ADT' : 'CHD';
    return `${lastName}/${firstName} ${gender}(${ageType})`;
  };

  const handlePassengerChange = (index: number, field: keyof PassengerInfo, value: string | 'nam' | 'nữ' | 'người_lớn' | 'trẻ_em') => {
    const newPassengers = [...passengers];
    if (field === 'Giới_tính') {
      newPassengers[index][field] = value as 'nam' | 'nữ';
    } else if (field === 'type') {
      newPassengers[index][field] = value as 'người_lớn' | 'trẻ_em';
    } else {
      newPassengers[index][field] = value as string;
    }
    setPassengers(newPassengers);
  };

  const addPassenger = () => {
    if (passengers.length >= maxSeats) {
      toast({
        title: "Lỗi",
        description: `Số lượng khách không được vượt quá ${maxSeats} ghế còn lại`,
        variant: "destructive"
      });
      return;
    }
    setPassengers([
      ...passengers,
      {
        Họ: '',
        Tên: '',
        Giới_tính: 'nam',
        type: 'người_lớn'
      }
    ]);
  };

  const removePassenger = (index: number) => {
    if (passengers.length === 1) {
      toast({
        title: "Lỗi",
        description: "Phải có ít nhất 1 hành khách",
        variant: "destructive"
      });
      return;
    }
    setPassengers(passengers.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      // Validate
      for (const passenger of passengers) {
        if (!passenger.Họ.trim() || !passenger.Tên.trim()) {
          throw new Error("Vui lòng điền đầy đủ thông tin hành khách");
        }
      }

      // Build URL with query params
      const params = new URLSearchParams();
      params.append('dep', flightInfo.dep);
      params.append('arr', flightInfo.arr);
      params.append('depdate', flightInfo.depdate);
      params.append('deptime', flightInfo.deptime.replace(':', ''));
      
      // Only add return date/time if round trip
      if (flightInfo.tripType === 'RT' && flightInfo.arrdate && flightInfo.arrtime) {
        params.append('arrdate', flightInfo.arrdate);
        params.append('arrtime', flightInfo.arrtime.replace(':', ''));
      }
      
      params.append('doituong', doiTuong);

      // Add passengers
      passengers.forEach(passenger => {
        const formattedName = formatNameForAPI(passenger.Họ, passenger.Tên, passenger.Giới_tính, passenger.type);
        params.append('hanhkhach', formattedName);
      });

      setIsLoading(true);
      const response = await fetch(`https://thuhongtour.com/giuveVNAlive?${params.toString()}`, {
        method: 'POST',
        headers: { 'accept': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.status === 'OK' && data.pnr) {
        setSuccessData({ pnr: data.pnr });
        
        // Auto close after 1.5s and trigger callback
        setTimeout(() => {
          setSuccessData(null);
          onClose();
          onBookingSuccess?.(data.pnr);
        }, 1500);
      } else {
        toast({
          title: "Lỗi giữ vé",
          description: data.message || "Không thể giữ vé. Vui lòng thử lại.",
          variant: "destructive",
          duration: 10000
        });
      }
    } catch (error: any) {
      console.error('Error booking VNA:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể giữ vé. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thông Tin Hành Khách - Giữ Vé VNA</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label>Đối tượng</Label>
              <Select value={doiTuong} onValueChange={(v: 'VFR' | 'ADT' | 'STU') => setDoiTuong(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VFR">VFR</SelectItem>
                  <SelectItem value="ADT">ADT</SelectItem>
                  <SelectItem value="STU">STU</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {passengers.map((passenger, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Hành khách {index + 1}</h3>
                  {passengers.length > 1 && (
                    <Button variant="destructive" size="sm" onClick={() => removePassenger(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Họ</Label>
                    <Input
                      value={passenger.Họ}
                      onChange={(e) => handlePassengerChange(index, 'Họ', e.target.value)}
                      placeholder="PHAM"
                    />
                  </div>
                  <div>
                    <Label>Tên</Label>
                    <Input
                      value={passenger.Tên}
                      onChange={(e) => handlePassengerChange(index, 'Tên', e.target.value)}
                      placeholder="THI NGANG"
                    />
                  </div>
                  <div>
                    <Label>Giới tính</Label>
                    <Select
                      value={passenger.Giới_tính}
                      onValueChange={(v: 'nam' | 'nữ') => handlePassengerChange(index, 'Giới_tính', v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nam">Nam (MR)</SelectItem>
                        <SelectItem value="nữ">Nữ (MS)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Loại khách</Label>
                    <Select
                      value={passenger.type}
                      onValueChange={(v: 'người_lớn' | 'trẻ_em') => handlePassengerChange(index, 'type', v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="người_lớn">Người lớn (ADT)</SelectItem>
                        <SelectItem value="trẻ_em">Trẻ em (CHD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addPassenger} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Thêm hành khách
            </Button>

            <Button className="w-full" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Đang giữ vé...' : 'Giữ vé ngay'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success popup */}
      <Dialog open={!!successData} onOpenChange={() => setSuccessData(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>🎉 Giữ vé VNA thành công!</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <p className="text-sm text-gray-600">Mã PNR:</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl font-bold text-green-600">{successData?.pnr}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(successData?.pnr || '');
                  toast({ title: "Đã copy PNR ✈️" });
                }}
              >
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button>
            </div>
          </div>

          <div className="flex justify-center mt-4">
            <Button
              onClick={() => {
                setSuccessData(null);
                onClose();
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
