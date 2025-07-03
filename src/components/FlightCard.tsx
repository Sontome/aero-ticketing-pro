
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plane, Clock, Users, Copy } from 'lucide-react';
import { Flight } from '@/services/flightApi';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface FlightCardProps {
  flight: Flight;
  priceMode: 'Page' | 'Live';
}

export const FlightCard: React.FC<FlightCardProps> = ({ flight, priceMode }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [adjustedPrice, setAdjustedPrice] = useState(flight.price);

  useEffect(() => {
    // Apply user's price markup
    const markup = profile?.price_markup || 0;
    let priceWithMarkup = flight.price * (1 + markup / 100);
    
    // Apply price mode adjustments
    const isRoundTrip = !!flight.return;
    if (priceMode === 'Page') {
      priceWithMarkup += isRoundTrip ? 20000 : 35000;
    } else {
      priceWithMarkup += isRoundTrip ? 10000 : 30000;
    }
    
    setAdjustedPrice(Math.round(priceWithMarkup));
  }, [flight.price, profile?.price_markup, priceMode, flight.return]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const formatDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/');
    return `${day}/${month}`;
  };

  const getFlightType = () => {
    const isDirect = flight.departure.stops === 0;
    return isDirect ? 'Bay thẳng' : `${flight.departure.stops} điểm dừng`;
  };

  const getBaggageInfo = () => {
    if (flight.airline === 'VJ') {
      return 'Vietjet 7kg xách tay, 20kg ký gửi';
    } else {
      // VNA baggage based on hành_lý_vna field
      if (flight.baggageType === 'ADT') {
        return 'VNairlines 10kg xách tay, 23kg ký gửi';
      } else {
        return 'VNairlines 10kg xách tay, 46kg ký gửi';
      }
    }
  };

  const getTicketClass = () => {
    if (flight.airline === 'VJ') {
      return `DELUXE-${flight.ticketClass}`;
    } else {
      return `${flight.ticketClass}-${flight.return?.ticketClass || 'R'}`;
    }
  };

  const handleCopyFlight = () => {
    const outboundLine = `${flight.departure.airport}-${flight.arrival.airport} ${flight.departure.time} ngày ${formatDate(flight.departure.date)}`;
    const returnLine = flight.return ? `${flight.return.departure.airport}-${flight.return.arrival.airport} ${flight.return.departure.time} ngày ${formatDate(flight.return.departure.date)}` : '';
    
    const copyText = `${outboundLine}${returnLine ? `\n${returnLine}` : ''}
${getBaggageInfo()}, giá vé = ${formatPrice(adjustedPrice)}w`;

    navigator.clipboard.writeText(copyText).then(() => {
      toast({
        title: "Đã copy thông tin chuyến bay",
        description: "Thông tin chuyến bay đã được copy vào clipboard",
      });
    }).catch(() => {
      toast({
        title: "Lỗi copy",
        description: "Không thể copy thông tin chuyến bay",
        variant: "destructive",
      });
    });
  };

  const isADT = flight.airline === 'VNA' && flight.baggageType === 'ADT';

  return (
    <Card className={`hover:shadow-lg transition-shadow duration-200 mb-4 ${isADT ? 'border-red-500 border-2' : ''}`}>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          {/* Price and Main Info */}
          <div className="flex justify-between items-start">
            <div>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {formatPrice(adjustedPrice)} KRW
              </div>
              <div className={`text-sm ${isADT ? 'text-red-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                Khứ hồi: {getTicketClass()} - {getFlightType()}
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Users className="w-4 h-4 mr-1" />
                Còn {flight.availableSeats} ghế
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={flight.airline === 'VJ' ? 'default' : 'secondary'}
                className={flight.airline === 'VJ' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600 text-white'}
              >
                {flight.airline === 'VJ' ? 'VietJet' : 'Vietnam Airlines'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyFlight}
                className="p-2"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Flight Details */}
          <div className="space-y-2">
            {/* Outbound Flight */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Plane className="w-4 h-4 text-blue-500" />
                <span className={`font-medium ${isADT ? 'text-red-600' : ''}`}>
                  {flight.departure.airport}-{flight.arrival.airport}
                </span>
                <span className={isADT ? 'text-red-600' : ''}>{flight.departure.time}</span>
                <span className={isADT ? 'text-red-600' : ''}>ngày {formatDate(flight.departure.date)}</span>
              </div>
            </div>

            {/* Return Flight (if applicable) */}
            {flight.return && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Plane className="w-4 h-4 text-blue-500 transform rotate-180" />
                  <span className={`font-medium ${isADT ? 'text-red-600' : ''}`}>
                    {flight.return.departure.airport}-{flight.return.arrival.airport}
                  </span>
                  <span className={isADT ? 'text-red-600' : ''}>{flight.return.departure.time}</span>
                  <span className={isADT ? 'text-red-600' : ''}>ngày {formatDate(flight.return.departure.date)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Baggage and Price Info */}
          <div className={`border-t pt-4 text-sm ${isADT ? 'text-red-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
            <div>{getBaggageInfo()}, giá vé = {formatPrice(adjustedPrice)}w</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
