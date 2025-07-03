
import { Clock, Plane, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Flight {
  id: string;
  airline: 'VJ' | 'VNA';
  flightNumber: string;
  departure: {
    time: string;
    airport: string;
    city: string;
  };
  arrival: {
    time: string;
    airport: string;
    city: string;
  };
  duration: string;
  price: number;
  currency: string;
  aircraft: string;
  availableSeats: number;
}

interface FlightCardProps {
  flight: Flight;
  priceMarkup?: number;
  onSelect: (flight: Flight) => void;
}

export const FlightCard = ({ flight, priceMarkup = 0, onSelect }: FlightCardProps) => {
  const finalPrice = Math.round(flight.price * (1 + priceMarkup / 100));
  
  const airlineColors = {
    VJ: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-700',
      text: 'text-green-700 dark:text-green-300',
      badge: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
    },
    VNA: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-700',
      text: 'text-blue-700 dark:text-blue-300',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
    }
  };

  const colors = airlineColors[flight.airline];

  return (
    <Card className={`${colors.bg} ${colors.border} hover:shadow-lg transition-all duration-200 cursor-pointer`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Badge className={colors.badge}>
              {flight.airline === 'VJ' ? 'VietJet Air' : 'Vietnam Airlines'}
            </Badge>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {flight.flightNumber}
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {finalPrice.toLocaleString('vi-VN')} {flight.currency}
            </div>
            {priceMarkup > 0 && (
              <div className="text-xs text-gray-500 line-through">
                {flight.price.toLocaleString('vi-VN')} {flight.currency}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 items-center mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {flight.departure.time}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {flight.departure.airport}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {flight.departure.city}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1"></div>
              <Plane className="w-4 h-4 mx-2 text-gray-400 transform rotate-90" />
              <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1"></div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center justify-center">
              <Clock className="w-3 h-3 mr-1" />
              {flight.duration}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {flight.arrival.time}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {flight.arrival.airport}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {flight.arrival.city}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <span>{flight.aircraft}</span>
            <span>{flight.availableSeats} chỗ trống</span>
          </div>
          <Button
            onClick={() => onSelect(flight)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2"
          >
            Chọn chuyến bay
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
