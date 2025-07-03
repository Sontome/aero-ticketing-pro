
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Clock, Users } from 'lucide-react';
import { Flight } from '@/services/flightApi';
import { useAuth } from '@/hooks/useAuth';

interface FlightCardProps {
  flight: Flight;
}

export const FlightCard: React.FC<FlightCardProps> = ({ flight }) => {
  const { profile } = useAuth();
  const [adjustedPrice, setAdjustedPrice] = useState(flight.price);

  useEffect(() => {
    // Apply user's price markup
    const markup = profile?.price_markup || 0;
    const priceWithMarkup = flight.price * (1 + markup / 100);
    setAdjustedPrice(Math.round(priceWithMarkup));
  }, [flight.price, profile?.price_markup]);

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
      return `${flight.outbound?.ticketClass || 'R'}-${flight.return?.ticketClass || 'R'}`;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 mb-4">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          {/* Price and Main Info */}
          <div className="flex justify-between items-start">
            <div>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {formatPrice(adjustedPrice)} KRW
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Khứ hồi: {getTicketClass()} - {getFlightType()}
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Users className="w-4 h-4 mr-1" />
                Còn {flight.availableSeats} ghế
              </div>
            </div>
            <Badge variant={flight.airline === 'VJ' ? 'default' : 'secondary'}>
              {flight.airline === 'VJ' ? 'VietJet' : 'Vietnam Airlines'}
            </Badge>
          </div>

          {/* Flight Details */}
          <div className="space-y-2">
            {/* Outbound Flight */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Plane className="w-4 h-4 text-blue-500" />
                <span className="font-medium">
                  {flight.departure.airport}-{flight.arrival.airport}
                </span>
                <span>{flight.departure.time}</span>
                <span>ngày {formatDate(flight.departure.date)}</span>
              </div>
            </div>

            {/* Return Flight (if applicable) */}
            {flight.return && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Plane className="w-4 h-4 text-blue-500 transform rotate-180" />
                  <span className="font-medium">
                    {flight.return.departure.airport}-{flight.return.arrival.airport}
                  </span>
                  <span>{flight.return.departure.time}</span>
                  <span>ngày {formatDate(flight.return.departure.date)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Baggage and Price Info */}
          <div className="border-t pt-4 text-sm text-gray-600 dark:text-gray-400">
            <div>{getBaggageInfo()}, giá vé = {formatPrice(adjustedPrice)}w</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
