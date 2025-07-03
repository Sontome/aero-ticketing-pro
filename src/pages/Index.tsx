import React, { useState } from 'react';
import { FlightSearchForm, SearchFormData } from '@/components/FlightSearchForm';
import { FlightCard } from '@/components/FlightCard';
import { FlightFilters, FilterOptions } from '@/components/FlightFilters';
import { fetchVietJetFlights, fetchVietnamAirlinesFlights, Flight } from '@/services/flightApi';

export default function Index() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const [filters, setFilters] = useState<FilterOptions>({
    airlines: ['VJ', 'VNA'],
    showCheapestOnly: true, // Default to true
    sortBy: 'price'
  });

  const handleSearch = async (searchData: SearchFormData) => {
    setLoading(true);
    setError(null);
    setSearchPerformed(true);

    try {
      const [vietJetFlights, vietnamAirlinesFlights] = await Promise.all([
        fetchVietJetFlights(searchData),
        fetchVietnamAirlinesFlights(searchData),
      ]);

      const allFlights = [...vietJetFlights, ...vietnamAirlinesFlights];
      setFlights(allFlights);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tìm kiếm chuyến bay
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Tìm kiếm và so sánh giá vé máy bay từ các hãng hàng không khác nhau.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <FlightSearchForm onSearch={handleSearch} loading={loading} />
        
        {flights.length > 0 && (
          <FlightFilters filters={filters} onFiltersChange={setFilters} />
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {filteredFlights.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Kết quả tìm kiếm ({filteredFlights.length} chuyến bay)
              </h2>
            </div>
            <div className="grid gap-4">
              {filteredFlights.map((flight) => (
                <FlightCard key={flight.id} flight={flight} />
              ))}
            </div>
          </div>
        )}

        {!loading && flights.length === 0 && searchPerformed && !error && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Không tìm thấy chuyến bay nào phù hợp với yêu cầu của bạn.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
