import React, { useState } from 'react';
import { FlightSearchForm, SearchFormData } from '@/components/FlightSearchForm';
import { FlightCard } from '@/components/FlightCard';
import { FlightFilters, FilterOptions } from '@/components/FlightFilters';
import { fetchVietJetFlights, fetchVietnamAirlinesFlights, Flight } from '@/services/flightApi';
import { Button } from '@/components/ui/button';
import { UserProfileDropdown } from '@/components/UserProfileDropdown';

export default function Index() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [priceMode, setPriceMode] = useState<'Page' | 'Live'>('Page');

  const [filters, setFilters] = useState<FilterOptions>({
    airlines: ['VJ', 'VNA'],
    showCheapestOnly: true,
    directFlightsOnly: true,
    show2pc: true,
    sortBy: 'price'
  });

  const playNotificationSound = () => {
    // Create a simple notification sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const handleSearch = async (searchData: SearchFormData) => {
    setLoading(true);
    setError(null);
    setSearchPerformed(true);
    setFlights([]); // Clear previous results

    try {
      // Start both API calls simultaneously
      const vietJetPromise = fetchVietJetFlights(searchData);
      const vietnamAirlinesPromise = fetchVietnamAirlinesFlights(searchData);

      // Handle VietJet results as soon as they arrive
      vietJetPromise.then((vietJetFlights) => {
        if (vietJetFlights.length > 0) {
          setFlights(prev => [...prev, ...vietJetFlights]);
          playNotificationSound();
        }
      }).catch((error) => {
        console.error('VietJet API error:', error);
      });

      // Handle Vietnam Airlines results as soon as they arrive
      vietnamAirlinesPromise.then((vietnamAirlinesFlights) => {
        if (vietnamAirlinesFlights.length > 0) {
          setFlights(prev => [...prev, ...vietnamAirlinesFlights]);
          setTimeout(() => playNotificationSound(), 200); // Slight delay for second notification
        }
      }).catch((error) => {
        console.error('Vietnam Airlines API error:', error);
      });

      // Wait for both to complete to update filters and loading state
      const [vietJetResult, vietnamAirlinesResult] = await Promise.allSettled([
        vietJetPromise,
        vietnamAirlinesPromise
      ]);

      let allFlights: Flight[] = [];

      if (vietJetResult.status === 'fulfilled') {
        allFlights = [...allFlights, ...vietJetResult.value];
      }

      if (vietnamAirlinesResult.status === 'fulfilled') {
        allFlights = [...allFlights, ...vietnamAirlinesResult.value];
      }

      // Auto-adjust filters based on available flights
      const hasDirectFlights = allFlights.some(f => f.departure.stops === 0);
      const hasVfr2pc = allFlights.some(f => f.airline === 'VNA' && f.baggageType === 'VFR');

      setFilters(prev => ({
        ...prev,
        directFlightsOnly: hasDirectFlights ? prev.directFlightsOnly : false,
        show2pc: hasVfr2pc ? prev.show2pc : false
      }));
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tìm kiếm chuyến bay.');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortFlights = (flights: Flight[]) => {
    let filtered = flights;

    // Filter by airlines
    if (filters.airlines.length > 0) {
      filtered = filtered.filter(flight => filters.airlines.includes(flight.airline));
    }

    // Filter for direct flights only - check both departure and return flights
    if (filters.directFlightsOnly) {
      filtered = filtered.filter(flight => {
        // For one-way flights, only check departure
        if (!flight.return) {
          return flight.departure.stops === 0;
        }
        // For round-trip flights, check both departure and return
        return flight.departure.stops === 0 && flight.return.stops === 0;
      });
    }

    // Filter for 2pc (VFR baggage type)
    if (filters.show2pc) {
      filtered = filtered.filter(flight => 
        flight.airline === 'VJ' || 
        (flight.airline === 'VNA' && flight.baggageType === 'VFR')
      );
    }

    // Filter for cheapest only
    if (filters.showCheapestOnly) {
      const vjFlights = filtered.filter(f => f.airline === 'VJ');
      const vnaFlights = filtered.filter(f => f.airline === 'VNA');
      
      const cheapestVJ = vjFlights.length > 0 ? 
        vjFlights.reduce((prev, current) => prev.price < current.price ? prev : current) : null;
      const cheapestVNA = vnaFlights.length > 0 ? 
        vnaFlights.reduce((prev, current) => prev.price < current.price ? prev : current) : null;
      
      filtered = [cheapestVJ, cheapestVNA].filter(Boolean) as Flight[];
    }

    // Sort flights
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price':
          return a.price - b.price;
        case 'duration':
          const aDuration = parseInt(a.duration.replace(/[^\d]/g, ''));
          const bDuration = parseInt(b.duration.replace(/[^\d]/g, ''));
          return aDuration - bDuration;
        case 'departure':
          return a.departure.time.localeCompare(b.departure.time);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredFlights = filterAndSortFlights(flights);

  // Separate flights by airline for side-by-side display
  const vjFlights = filteredFlights.filter(f => f.airline === 'VJ');
  const vnaFlights = filteredFlights.filter(f => f.airline === 'VNA');

  // Check if we have direct flights (both departure and return for round-trip)
  const hasDirectFlights = flights.some(f => {
    if (!f.return) {
      return f.departure.stops === 0;
    }
    return f.departure.stops === 0 && f.return.stops === 0;
  });
  const hasVfr2pc = flights.some(f => f.airline === 'VNA' && f.baggageType === 'VFR');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-all duration-300">
      <header className="bg-white dark:bg-gray-800 shadow transition-all duration-300">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="transition-all duration-200">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Hàn Việt Air
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Tìm kiếm và so sánh giá vé máy bay từ các hãng hàng không khác nhau.
              </p>
            </div>
            <UserProfileDropdown />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="animate-fade-in">
          <FlightSearchForm onSearch={handleSearch} loading={loading} />
        </div>
        
        {flights.length > 0 && (
          <div className="animate-fade-in">
            <FlightFilters 
              filters={filters} 
              onFiltersChange={setFilters}
              hasDirectFlights={hasDirectFlights}
              hasVfr2pc={hasVfr2pc}
            />
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12 animate-fade-in">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8 animate-fade-in">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {filteredFlights.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* VietJet flights on the left */}
              <div className="space-y-4">
                {vjFlights.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg transition-all duration-300">
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">
                      VietJet ({vjFlights.length} chuyến bay)
                    </h3>
                    <div className="space-y-4">
                      {vjFlights.map((flight) => (
                        <FlightCard key={flight.id} flight={flight} priceMode={priceMode} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Vietnam Airlines flights on the right */}
              <div className="space-y-4">
                {vnaFlights.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg transition-all duration-300">
                    <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">
                      Vietnam Airlines ({vnaFlights.length} chuyến bay)
                    </h3>
                    <div className="space-y-4">
                      {vnaFlights.map((flight) => (
                        <FlightCard key={flight.id} flight={flight} priceMode={priceMode} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && flights.length === 0 && searchPerformed && !error && (
          <div className="text-center py-12 animate-fade-in">
            <p className="text-gray-500 dark:text-gray-400">
              Không tìm thấy chuyến bay nào phù hợp với yêu cầu của bạn.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
