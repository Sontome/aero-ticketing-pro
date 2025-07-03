import { useState, useEffect } from 'react';
import { Plane, LogIn, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FlightSearchForm } from '@/components/FlightSearchForm';
import { FlightCard } from '@/components/FlightCard';
import { FlightFilters } from '@/components/FlightFilters';
import { AuthModal } from '@/components/AuthModal';
import { AdminDashboard } from '@/components/AdminDashboard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { fetchVietJetFlights, fetchVietnamAirlinesFlights, Flight } from '@/services/flightApi';

interface SearchFormData {
  from: string;
  to: string;
  departureDate: Date | undefined;
  returnDate: Date | undefined;
  passengers: number;
  tripType: 'one_way' | 'round_trip';
}

interface FilterOptions {
  airlines: string[];
  priceRange: [number, number];
  timeRanges: {
    departure: string[];
    arrival: string[];
  };
  stops: string[];
}

const Index = () => {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [vjFlights, setVjFlights] = useState<Flight[]>([]);
  const [vnaFlights, setVnaFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    airlines: ['VJ', 'VNA'],
    priceRange: [0, 20000000],
    timeRanges: {
      departure: [],
      arrival: [],
    },
    stops: [],
  });

  const handleSearch = async (searchData: SearchFormData) => {
    console.log('Searching flights:', searchData);
    setLoading(true);
    setFlights([]);
    setVjFlights([]);
    setVnaFlights([]);

    // Save search history if user is logged in
    if (user) {
      try {
        await supabase.from('search_history').insert({
          user_id: user.id,
          departure_city: searchData.from,
          arrival_city: searchData.to,
          departure_date: searchData.departureDate?.toISOString().split('T')[0],
          return_date: searchData.returnDate?.toISOString().split('T')[0],
          trip_type: searchData.tripType,
          passenger_count: searchData.passengers,
        });
      } catch (error) {
        console.error('Error saving search history:', error);
      }
    }

    // Start both API calls simultaneously
    const vjPromise = fetchVietJetFlights(searchData).then(flights => {
      console.log('VietJet flights loaded:', flights);
      setVjFlights(flights);
      return flights;
    }).catch(error => {
      console.error('VietJet API failed:', error);
      toast({
        variant: "destructive",
        title: "Lỗi tải dữ liệu VietJet",
        description: "Không thể tải dữ liệu từ VietJet Air",
      });
      return [];
    });

    const vnaPromise = fetchVietnamAirlinesFlights(searchData).then(flights => {
      console.log('Vietnam Airlines flights loaded:', flights);
      setVnaFlights(flights);
      return flights;
    }).catch(error => {
      console.error('Vietnam Airlines API failed:', error);
      toast({
        variant: "destructive",
        title: "Lỗi tải dữ liệu Vietnam Airlines",
        description: "Không thể tải dữ liệu từ Vietnam Airlines",
      });
      return [];
    });

    // Update results as each API responds
    try {
      const results = await Promise.allSettled([vjPromise, vnaPromise]);
      
      let allFlights: Flight[] = [];
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          allFlights = [...allFlights, ...result.value];
        }
      });

      setFlights(allFlights);
      
      if (allFlights.length === 0) {
        toast({
          title: "Không tìm thấy chuyến bay",
          description: "Vui lòng thử lại với thông tin khác",
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        variant: "destructive",
        title: "Lỗi tìm kiếm",
        description: "Có lỗi xảy ra khi tìm kiếm chuyến bay",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeSlot = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 6) return 'early_morning';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const filteredFlights = flights.filter(flight => {
    // Airline filter
    if (filters.airlines.length > 0 && !filters.airlines.includes(flight.airline)) {
      return false;
    }

    // Price filter
    const adjustedPrice = Math.round(flight.price * (1 + (profile?.price_markup || 0) / 100));
    if (adjustedPrice < filters.priceRange[0] || adjustedPrice > filters.priceRange[1]) {
      return false;
    }

    // Departure time filter
    if (filters.timeRanges.departure.length > 0) {
      const departureSlot = getTimeSlot(flight.departure.time);
      if (!filters.timeRanges.departure.includes(departureSlot)) {
        return false;
      }
    }

    // Arrival time filter
    if (filters.timeRanges.arrival.length > 0) {
      const arrivalSlot = getTimeSlot(flight.arrival.time);
      if (!filters.timeRanges.arrival.includes(arrivalSlot)) {
        return false;
      }
    }

    return true;
  });

  const maxPrice = Math.max(...flights.map(f => Math.round(f.price * (1 + (profile?.price_markup || 0) / 100))), 20000000);

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      priceRange: [0, maxPrice],
    }));
  }, [maxPrice]);

  // Update combined flights when individual airline results come in
  useEffect(() => {
    const combined = [...vjFlights, ...vnaFlights];
    setFlights(combined);
  }, [vjFlights, vnaFlights]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show admin dashboard if user is admin
  if (user && profile?.role === 'admin') {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <ThemeToggle />
      
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                FlightSearch
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Tìm kiếm vé máy bay giá tốt nhất
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {profile?.full_name || user.email}
                  </span>
                </div>
                <Button onClick={signOut} variant="outline" size="sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Đăng xuất
                </Button>
              </div>
            ) : (
              <Button onClick={() => setAuthModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <LogIn className="w-4 h-4 mr-2" />
                Đăng nhập
              </Button>
            )}
          </div>
        </div>

        {/* Search Form */}
        <div className="mb-8">
          <FlightSearchForm onSearch={handleSearch} loading={loading} />
        </div>

        {/* Results */}
        {(flights.length > 0 || vjFlights.length > 0 || vnaFlights.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters */}
            <div className="lg:col-span-1">
              <FlightFilters
                filters={filters}
                onFiltersChange={setFilters}
                maxPrice={maxPrice}
              />
            </div>

            {/* Flight Results */}
            <div className="lg:col-span-3 space-y-4">
              {/* VietJet Results */}
              {vjFlights.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    VietJet Air ({vjFlights.filter(f => filteredFlights.includes(f)).length} chuyến bay)
                  </h3>
                  <div className="space-y-3">
                    {vjFlights.filter(f => filteredFlights.includes(f)).map((flight) => (
                      <FlightCard
                        key={flight.id}
                        flight={flight}
                        priceMarkup={profile?.price_markup || 0}
                        onSelect={(flight) => {
                          toast({
                            title: "Đã chọn chuyến bay",
                            description: `${flight.flightNumber} - ${flight.departure.time} → ${flight.arrival.time}`,
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Vietnam Airlines Results */}
              {vnaFlights.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center">
                    <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                    Vietnam Airlines ({vnaFlights.filter(f => filteredFlights.includes(f)).length} chuyến bay)
                  </h3>
                  <div className="space-y-3">
                    {vnaFlights.filter(f => filteredFlights.includes(f)).map((flight) => (
                      <FlightCard
                        key={flight.id}
                        flight={flight}
                        priceMarkup={profile?.price_markup || 0}
                        onSelect={(flight) => {
                          toast({
                            title: "Đã chọn chuyến bay",
                            description: `${flight.flightNumber} - ${flight.departure.time} → ${flight.arrival.time}`,
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Loading States */}
              {loading && (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Đang tìm kiếm chuyến bay từ các hãng hàng không...
                    </p>
                  </div>
                </div>
              )}

              {/* No Results */}
              {!loading && flights.length === 0 && (vjFlights.length > 0 || vnaFlights.length > 0) && (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">
                    Không tìm thấy chuyến bay phù hợp với bộ lọc hiện tại
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && flights.length === 0 && vjFlights.length === 0 && vnaFlights.length === 0 && (
          <div className="text-center py-16">
            <Plane className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Chưa có kết quả tìm kiếm
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Vui lòng điền thông tin và nhấn "Tìm chuyến bay" để bắt đầu
            </p>
          </div>
        )}
      </div>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
};

export default Index;
