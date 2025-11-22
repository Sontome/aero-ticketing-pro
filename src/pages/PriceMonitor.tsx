import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, RefreshCw, Bell, Pencil, Users, ShoppingBasket } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { PassengerWithType, PassengerInfo, BookingModal } from "@/components/VJBookingModal";
import { Switch } from "@/components/ui/switch";

interface FlightSegment {
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  departure_time?: string;
  ticket_class: "economy" | "business";
}

interface MonitoredFlight {
  id: string;
  airline: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  departure_time?: string;
  is_round_trip?: boolean;
  return_date?: string;
  return_time?: string;
  segments?: FlightSegment[];
  ticket_class?: string;
  current_price: number | null;
  last_checked_at: string | null;
  check_interval_minutes: number;
  is_active: boolean;
  passengers?: PassengerWithType[];
  booking_key_departure?: string;
  booking_key_return?: string;
  auto_hold_enabled?: boolean;
  pnr?: string;
}

// Korean airports
const KOREAN_AIRPORTS = ["ICN", "GMP", "PUS", "CJU", "TAE", "KWJ", "USN", "CHN", "RSU", "KUV"];

// Vietnamese airports
const VIETNAMESE_AIRPORTS = [
  "HAN",
  "SGN",
  "DAD",
  "CXR",
  "HPH",
  "HUI",
  "VCA",
  "VCS",
  "VDO",
  "VII",
  "PQC",
  "UIH",
  "DIN",
  "BMV",
  "VKG",
];

// All airports combined
const ALL_AIRPORTS = [...VIETNAMESE_AIRPORTS, ...KOREAN_AIRPORTS].sort();

// Generate time options in 5-minute intervals
const TIME_OPTIONS = Array.from({ length: 288 }, (_, i) => {
  const hours = Math.floor(i / 12);
  const minutes = (i % 12) * 5;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
});

// Get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split("T")[0];
};

export default function PriceMonitor() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [flights, setFlights] = useState<MonitoredFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const [editCheckInterval, setEditCheckInterval] = useState("60");
  const [checkingFlightId, setCheckingFlightId] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<MonitoredFlight | null>(null);
  const [isPnrModalOpen, setIsPnrModalOpen] = useState(false);
  const [pnrCode, setPnrCode] = useState("");
  const [pnrAirline, setPnrAirline] = useState<"VJ" | "VNA">("VJ");
  const [exactTimeMatch, setExactTimeMatch] = useState(true);
  const [isLoadingPnr, setIsLoadingPnr] = useState(false);

  // Form state
  const [airline, setAirline] = useState<"VJ" | "VNA">("VJ");
  const [departureAirport, setDepartureAirport] = useState("");
  const [arrivalAirport, setArrivalAirport] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [checkInterval, setCheckInterval] = useState("60");

  // VNA segments state
  const [vnaSegments, setVnaSegments] = useState<FlightSegment[]>([
    { departure_airport: "", arrival_airport: "", departure_date: "", departure_time: "", ticket_class: "economy" },
  ]);

  useEffect(() => {
    if (!profile?.perm_check_discount) {
      navigate("/");
      return;
    }
    fetchMonitoredFlights();

    // Refresh every second to update progress bars and check if auto-check is needed
    const interval = setInterval(() => {
      setFlights((prev) => {
        // Don't run auto-check if flights array is empty (still loading)
        if (prev.length === 0) return prev;

        // Check if any active flight needs auto-check
        prev.forEach((flight) => {
          // Only auto-check if flight has been checked at least once (last_checked_at is not null)
          if (flight.is_active && !checkingFlightId && flight.last_checked_at) {
            const progress = calculateProgress(flight.last_checked_at, flight.check_interval_minutes);
            if (progress >= 100) {
              // Auto-trigger check when timer reaches 100%
              handleManualCheck(flight.id);
            }
          }
        });
        return [...prev];
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [profile, navigate, checkingFlightId]);

  // Auto-check when entering page if needed
  useEffect(() => {
    if (loading || flights.length === 0 || checkingFlightId) return;

    flights.forEach((flight) => {
      if (!flight.is_active) return;

      // Check if never checked OR time since last check exceeds interval
      const shouldCheck =
        !flight.last_checked_at ||
        (flight.last_checked_at && calculateProgress(flight.last_checked_at, flight.check_interval_minutes) >= 100);

      if (shouldCheck) {
        handleManualCheck(flight.id);
      }
    });
  }, [loading, flights]);

  const fetchMonitoredFlights = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("monitored_flights")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map data to properly typed flights
      const typedFlights: MonitoredFlight[] = (data || []).map((flight) => ({
        ...flight,
        segments: flight.segments ? (flight.segments as any as FlightSegment[]) : undefined,
        passengers: flight.passengers ? (flight.passengers as any as PassengerWithType[]) : undefined,
      }));

      setFlights(typedFlights);
    } catch (error) {
      console.error("Error fetching monitored flights:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách chuyến bay theo dõi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFlight = async () => {
    const today = getTodayString();

    // Validate based on airline
    if (airline === "VJ") {
      if (!departureAirport || !arrivalAirport || !departureDate) {
        toast({
          title: "Lỗi",
          description: "Vui lòng điền đầy đủ thông tin",
          variant: "destructive",
        });
        return;
      }

      // Validate departure date is in the future
      if (departureDate <= today) {
        toast({
          title: "Lỗi",
          description: "Ngày đi phải lớn hơn ngày hiện tại",
          variant: "destructive",
        });
        return;
      }

      if (isRoundTrip) {
        if (!returnDate) {
          toast({
            title: "Lỗi",
            description: "Vui lòng chọn ngày về",
            variant: "destructive",
          });
          return;
        }
        // Validate return date is after departure date
        if (returnDate <= departureDate) {
          toast({
            title: "Lỗi",
            description: "Ngày về phải lớn hơn ngày đi",
            variant: "destructive",
          });
          return;
        }
      }
    } else {
      // VNA validation
      const invalidSegment = vnaSegments.find(
        (seg) => !seg.departure_airport || !seg.arrival_airport || !seg.departure_date,
      );
      if (invalidSegment) {
        toast({
          title: "Lỗi",
          description: "Vui lòng điền đầy đủ thông tin cho tất cả hành trình",
          variant: "destructive",
        });
        return;
      }

      // Validate first segment date is in the future
      if (vnaSegments[0].departure_date <= today) {
        toast({
          title: "Lỗi",
          description: "Ngày đi phải lớn hơn ngày hiện tại",
          variant: "destructive",
        });
        return;
      }

      // Validate sequential dates for multi-segment
      for (let i = 1; i < vnaSegments.length; i++) {
        if (vnaSegments[i].departure_date <= vnaSegments[i - 1].departure_date) {
          toast({
            title: "Lỗi",
            description: `Ngày đi chặng ${i + 1} phải lớn hơn ngày đi chặng ${i}`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const insertData: any = {
        user_id: user.id,
        airline,
        check_interval_minutes: parseInt(checkInterval),
        pnr: Array.from(
          { length: 6 },
          () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)],
        ).join(""),
      };

      if (airline === "VJ") {
        insertData.departure_airport = departureAirport;
        insertData.arrival_airport = arrivalAirport;
        insertData.departure_date = departureDate;
        insertData.departure_time = departureTime || null;
        insertData.is_round_trip = isRoundTrip;
        insertData.return_date = isRoundTrip ? returnDate : null;
        insertData.return_time = isRoundTrip ? returnTime || null : null;
      } else {
        // For VNA, use segments
        insertData.segments = vnaSegments;
        insertData.departure_airport = vnaSegments[0].departure_airport;
        insertData.arrival_airport = vnaSegments[vnaSegments.length - 1].arrival_airport;
        insertData.departure_date = vnaSegments[0].departure_date;
      }

      const { data: newFlight, error } = await supabase.from("monitored_flights").insert(insertData).select().single();

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã thêm chuyến bay vào danh sách theo dõi",
      });

      // Reset form
      setDepartureAirport("");
      setArrivalAirport("");
      setDepartureDate("");
      setDepartureTime("");
      setIsRoundTrip(false);
      setReturnDate("");
      setReturnTime("");
      setCheckInterval("60");
      setVnaSegments([
        { departure_airport: "", arrival_airport: "", departure_date: "", departure_time: "", ticket_class: "economy" },
      ]);
      setIsAddModalOpen(false);

      // Fetch updated list first
      await fetchMonitoredFlights();

      // Then automatically check price for the new flight
      if (newFlight) {
        setTimeout(() => {
          handleManualCheck(newFlight.id);
        }, 500);
      }
    } catch (error) {
      console.error("Error adding flight:", error);
      toast({
        title: "Lỗi",
        description: "Không thể thêm chuyến bay",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("monitored_flights").delete().eq("id", id);

      if (error) throw error;

      setFlights(flights.filter((f) => f.id !== id));
      toast({
        title: "Đã xóa",
        description: "Đã xóa chuyến bay khỏi danh sách theo dõi",
      });
    } catch (error) {
      console.error("Error deleting flight:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa chuyến bay",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("monitored_flights").update({ is_active: !currentStatus }).eq("id", id);

      if (error) throw error;

      setFlights(flights.map((f) => (f.id === id ? { ...f, is_active: !currentStatus } : f)));

      toast({
        title: !currentStatus ? "Đã bật" : "Đã tắt",
        description: !currentStatus ? "Đã bật theo dõi giá" : "Đã tắt theo dõi giá",
      });
    } catch (error) {
      console.error("Error toggling active:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    }
  };

  const handleManualCheck = async (flightId: string) => {
    setCheckingFlightId(flightId);

    try {
      // Find the flight in current state
      const flight = flights.find((f) => f.id === flightId);
      if (!flight) {
        throw new Error("Không tìm thấy thông tin chuyến bay");
      }

      // Only support VJ for now
      if (flight.airline !== "VJ") {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Hiện tại chỉ hỗ trợ kiểm tra giá VietJet",
        });
        return;
      }

      // Build request body for VJ API
      const requestBody: any = {
        dep0: flight.departure_airport,
        arr0: flight.arrival_airport,
        depdate0: flight.departure_date,
        adt: "1",
        chd: "0",
        inf: "0",
        sochieu: flight.is_round_trip ? "RT" : "OW",
      };

      if (flight.is_round_trip && flight.return_date) {
        requestBody.depdate1 = flight.return_date;
      }

      // Call VJ API directly
      const response = await fetch("https://thuhongtour.com/vj/check-ve-v2", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Không thể kết nối API VietJet");
      }

      const data = await response.json();

      if (!data.body || data.body.length === 0) {
        toast({
          variant: "destructive",
          title: "Không tìm thấy chuyến bay",
          description: "Không có chuyến bay nào phù hợp với hành trình này",
        });
        return;
      }

      // Find matching flight
      let matchingFlight: any = null;

      if (flight.departure_time || (flight.is_round_trip && flight.return_time)) {
        // Filter by specific time
        const filtered = data.body.filter((f: any) => {
          const departureMatch = flight.departure_time ? f["chiều_đi"]?.giờ_cất_cánh === flight.departure_time : true;

          const returnMatch =
            flight.is_round_trip && flight.return_time ? f["chiều_về"]?.giờ_cất_cánh === flight.return_time : true;

          return departureMatch && returnMatch;
        });

        if (filtered.length > 0) {
          matchingFlight = filtered[0];
        }
      } else {
        // Find cheapest flight
        matchingFlight = data.body.reduce((cheapest: any, current: any) => {
          const currentPrice = parseInt(current["thông_tin_chung"]?.giá_vé || "999999999");
          const cheapestPrice = parseInt(cheapest["thông_tin_chung"]?.giá_vé || "999999999");
          return currentPrice < cheapestPrice ? current : cheapest;
        }, data.body[0]);
      }

      if (!matchingFlight) {
        // Update last_checked_at even when no matching flight is found (reset timer)
        await supabase
          .from("monitored_flights")
          .update({ last_checked_at: new Date().toISOString() })
          .eq("id", flightId);

        toast({
          variant: "destructive",
          title: "Không tìm thấy chuyến bay",
          description: "Không có chuyến bay nào phù hợp với giờ bay đã chọn",
        });
        fetchMonitoredFlights();
        return;
      }

      const newPrice = parseInt(matchingFlight["thông_tin_chung"]?.giá_vé || "0");
      const oldPrice = flight.current_price;
      const bookingKeyDeparture = matchingFlight["chiều_đi"]?.BookingKey || matchingFlight["chiều_đi"]?.booking_key;
      const bookingKeyReturn = flight.is_round_trip
        ? matchingFlight["chiều_về"]?.BookingKey || matchingFlight["chiều_về"]?.booking_key
        : null;

      console.log("Booking Keys:", { bookingKeyDeparture, bookingKeyReturn });

      // Update database with new price, booking keys, and last_checked_at
      const { error: updateError } = await supabase
        .from("monitored_flights")
        .update({
          current_price: newPrice,
          booking_key_departure: bookingKeyDeparture,
          booking_key_return: bookingKeyReturn,
          last_checked_at: new Date().toISOString(),
        })
        .eq("id", flightId);

      if (updateError) throw updateError;

      // Check if auto-hold should be triggered
      const shouldAutoHold =
        flight.auto_hold_enabled &&
        ((oldPrice && oldPrice > 0 && newPrice < oldPrice) || ((!oldPrice || oldPrice === 0) && newPrice > 0));

      if (shouldAutoHold && bookingKeyDeparture && flight.passengers && flight.passengers.length > 0) {
        try {
          // Call auto-hold function
          await handleAutoHoldTicket(flight, bookingKeyDeparture, bookingKeyReturn);
          return; // Exit early as the flight is now held and deleted
        } catch (error) {
          console.error("Auto-hold failed:", error);
          // Continue with normal flow if auto-hold fails
        }
      }

      // Show notification based on price change
      if (oldPrice !== null && oldPrice !== undefined) {
        const priceDiff = newPrice - oldPrice;

        if (priceDiff < 0) {
          toast({
            title: "Giá vé giảm! 🎉",
            description: `Giá mới: ${newPrice.toLocaleString()} KRW (giảm ${Math.abs(priceDiff).toLocaleString()} KRW)`,
            className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
          });
        } else if (priceDiff > 0) {
          toast({
            title: "Giá vé tăng",
            description: `Giá mới: ${newPrice.toLocaleString()} KRW (tăng ${priceDiff.toLocaleString()} KRW)`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Giá vé không đổi",
            description: `Giá hiện tại: ${newPrice.toLocaleString()} KRW`,
          });
        }
      } else {
        toast({
          title: "Đã cập nhật giá",
          description: `Giá hiện tại: ${newPrice.toLocaleString()} KRW`,
        });
      }

      await fetchMonitoredFlights();
    } catch (error) {
      console.error("Error checking price:", error);
      // Only show toast if it's not the "flight not found" error (which happens on initial load)
      if (error instanceof Error && error.message !== "Không tìm thấy thông tin chuyến bay") {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: error.message,
        });
      }
    } finally {
      setCheckingFlightId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Chưa kiểm tra";
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN");
  };

  const formatFlightDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const calculateProgress = (lastChecked: string | null, intervalMinutes: number) => {
    if (!lastChecked) return 0;
    const lastCheckedTime = new Date(lastChecked).getTime();
    const now = Date.now();
    const elapsed = now - lastCheckedTime;
    const intervalMs = intervalMinutes * 60 * 1000;
    const progress = (elapsed / intervalMs) * 100;
    return Math.min(progress, 100);
  };

  const getTimeUntilNextCheck = (lastChecked: string | null, intervalMinutes: number) => {
    if (!lastChecked) return "Chưa check";
    const lastCheckedTime = new Date(lastChecked).getTime();
    const now = Date.now();
    const elapsed = now - lastCheckedTime;
    const intervalMs = intervalMinutes * 60 * 1000;
    const remaining = intervalMs - elapsed;

    if (remaining <= 0) return "Sẵn sàng check";

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleUpdateInterval = async (flightId: string, newInterval: number) => {
    try {
      const { error } = await supabase
        .from("monitored_flights")
        .update({ check_interval_minutes: newInterval })
        .eq("id", flightId);

      if (error) throw error;

      setFlights(flights.map((f) => (f.id === flightId ? { ...f, check_interval_minutes: newInterval } : f)));

      setEditingFlightId(null);
      toast({
        title: "Đã cập nhật",
        description: "Đã cập nhật tần suất kiểm tra",
      });
    } catch (error) {
      console.error("Error updating interval:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật tần suất kiểm tra",
        variant: "destructive",
      });
    }
  };

  const handleToggleAutoHold = async (flightId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("monitored_flights")
        .update({ auto_hold_enabled: !currentStatus })
        .eq("id", flightId);

      if (error) throw error;

      setFlights(flights.map((f) => (f.id === flightId ? { ...f, auto_hold_enabled: !currentStatus } : f)));

      toast({
        title: !currentStatus ? "Đã bật giữ vé tự động" : "Đã tắt giữ vé tự động",
        description: !currentStatus ? "Hệ thống sẽ tự động giữ vé khi giá giảm" : "Đã tắt chức năng giữ vé tự động",
      });
    } catch (error) {
      console.error("Error toggling auto hold:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    }
  };

  const handleBookingSuccess = async (pnr: string) => {
    if (!selectedFlight) return;

    // Delete the monitored flight after successful booking
    try {
      const { error } = await supabase.from("monitored_flights").delete().eq("id", selectedFlight.id);

      if (error) throw error;

      toast({
        title: "Đã giữ vé thành công",
        description: `PNR: ${pnr}. Hành trình đã được xóa khỏi danh sách theo dõi.`,
      });

      setBookingModalOpen(false);
      setSelectedFlight(null);
      await fetchMonitoredFlights();
    } catch (error) {
      console.error("Error deleting monitored flight:", error);
    }
  };

  const handleAutoHoldTicket = async (
    flight: MonitoredFlight,
    bookingKeyDeparture: string,
    bookingKeyReturn: string | null,
  ) => {
    if (!flight.passengers || flight.passengers.length === 0) {
      throw new Error("Không có thông tin hành khách");
    }

    // Helper functions from VJBookingModal
    const removeVietnameseDiacritics = (str: string): string => {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
    };

    const formatName = (name: string): string => {
      const cleaned = removeVietnameseDiacritics(name);
      return cleaned
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    };

    // Organize passengers
    const adults: any[] = [];
    const children: any[] = [];
    const infants: any[] = [];

    flight.passengers.forEach((passenger) => {
      const formattedPassenger = {
        Họ: formatName(passenger.Họ),
        Tên: formatName(passenger.Tên),
        Hộ_chiếu: passenger.Hộ_chiếu,
        Giới_tính: passenger.Giới_tính,
        Quốc_tịch: passenger.Quốc_tịch,
      };

      if (passenger.type === "người_lớn") {
        adults.push(formattedPassenger);
        if (passenger.infant) {
          infants.push({
            Họ: formatName(passenger.infant.Họ),
            Tên: formatName(passenger.infant.Tên),
            Hộ_chiếu: passenger.infant.Hộ_chiếu,
            Giới_tính: passenger.infant.Giới_tính,
            Quốc_tịch: passenger.infant.Quốc_tịch,
          });
        }
      } else if (passenger.type === "trẻ_em") {
        children.push(formattedPassenger);
      }
    });

    const requestBody: any = {
      ds_khach: {
        người_lớn: adults,
      },
      bookingkey: bookingKeyDeparture,
      sochieu: flight.is_round_trip ? "RT" : "OW",
      sanbaydi: flight.departure_airport,
    };

    if (children.length > 0) {
      requestBody.ds_khach.trẻ_em = children;
    }

    if (infants.length > 0) {
      requestBody.ds_khach.em_bé = infants;
    }

    if (flight.is_round_trip && bookingKeyReturn) {
      requestBody.bookingkeychieuve = bookingKeyReturn;
    }

    // Call VJ booking API
    const response = await fetch("https://thuhongtour.com/vj/booking", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error("Không thể kết nối API giữ vé");
    }

    const data = await response.json();

    if (!data.mã_giữ_vé || (data.mess !== "Thành công" && data.mess !== "Success")) {
      throw new Error("Giữ vé thất bại");
    }

    // Save to held_tickets
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Không tìm thấy thông tin người dùng");

    // Parse expire date from "18:02 17/11/2025" format (GMT+7)
    let expireDate = null;
    if (data.hạn_thanh_toán) {
      try {
        const [time, dateStr] = data.hạn_thanh_toán.split(" ");
        const [day, month, year] = dateStr.split("/");
        expireDate = `${year}-${month}-${day}T${time}:00+07:00`;
      } catch (e) {
        console.error("Error parsing expire date:", e);
      }
    }

    const { error: insertError } = await supabase.from("held_tickets").insert({
      pnr: data.mã_giữ_vé,
      user_id: user.id,
      flight_details: {
        airline: flight.airline,
        departure_airport: flight.departure_airport,
        arrival_airport: flight.arrival_airport,
        departure_date: flight.departure_date,
        return_date: flight.return_date,
        price: flight.current_price,
        passengers: flight.passengers,
      } as any,
      expire_date: expireDate,
    });

    if (insertError) throw insertError;

    // Check if original PNR exists in held tickets and delete it
    if (flight.pnr) {
      const { data: existingTickets } = await supabase
        .from("held_tickets")
        .select("id")
        .eq("user_id", user.id)
        .eq("pnr", flight.pnr);

      if (existingTickets && existingTickets.length > 0) {
        const { error: deleteOldPnrError } = await supabase
          .from("held_tickets")
          .delete()
          .eq("pnr", flight.pnr)
          .eq("user_id", user.id);

        if (deleteOldPnrError) {
          console.error("Error deleting old PNR:", deleteOldPnrError);
        }
      }
    }

    // Delete monitored flight
    const { error: deleteError } = await supabase.from("monitored_flights").delete().eq("id", flight.id);

    if (deleteError) throw deleteError;

    toast({
      title: "Đã tự động giữ vé thành công! 🎉",
      description: `PNR: ${data.mã_giữ_vé}. Hành trình đã được chuyển vào giỏ vé.`,
      className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    });

    await fetchMonitoredFlights();
  };

  const handleOpenBookingModal = (flightId: string) => {
    const flight = flights.find((f) => f.id === flightId);
    if (!flight) return;

    setSelectedFlight(flight);
    setBookingModalOpen(true);
  };

  const handleSavePassengers = async (flightId: string, passengers: PassengerWithType[]) => {
    try {
      const { error } = await supabase
        .from("monitored_flights")
        .update({ passengers: passengers as any })
        .eq("id", flightId);

      if (error) throw error;

      // Cập nhật state local
      setFlights((prev) => prev.map((f) => (f.id === flightId ? { ...f, passengers } : f)));

      toast({
        title: "Đã lưu thông tin hành khách",
        description: "Thông tin hành khách đã được cập nhật",
      });
    } catch (error) {
      console.error("Error saving passengers:", error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu thông tin hành khách",
        variant: "destructive",
      });
    }
  };

  const handleImportFromPnr = async () => {
    if (!pnrCode || pnrCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng nhập mã PNR hợp lệ (6 ký tự)",
      });
      return;
    }

    if (pnrAirline === "VNA") {
      toast({
        variant: "destructive",
        title: "Chưa hỗ trợ",
        description: "Tính năng nhập PNR từ Vietnam Airlines đang được phát triển",
      });
      return;
    }

    setIsLoadingPnr(true);

    try {
      const response = await fetch(`https://thuhongtour.com/vj/checkpnr?pnr=${pnrCode}`, {
        method: "POST",
        headers: {
          accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Không thể lấy thông tin PNR");
      }

      const data = await response.json();

      if (data.status !== "OK") {
        throw new Error("PNR không hợp lệ hoặc không tìm thấy");
      }

      // Parse date from "07/02/2026" to "2026-02-07"
      const parseDate = (dateStr: string) => {
        const [day, month, year] = dateStr.split("/");
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      };

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Không tìm thấy thông tin người dùng");

      // Create monitored flight from PNR data
      const flightData: any = {
        user_id: user.id,
        airline: "VJ",
        departure_airport: data.chieudi.departure,
        arrival_airport: data.chieudi.arrival,
        departure_date: parseDate(data.chieudi.ngaycatcanh),
        departure_time: exactTimeMatch ? data.chieudi.giocatcanh : null,
        check_interval_minutes: 5,
        is_active: true,
        ticket_class: data.chieudi.loaive === "ECO" || data.chieudi.loaive === "DELUXE" ? "economy" : "business",
        pnr: pnrCode,
      };

      // Check if round trip
      if (data.chieuve) {
        flightData.is_round_trip = true;
        flightData.return_date = parseDate(data.chieuve.ngaycatcanh);
        flightData.return_time = exactTimeMatch ? data.chieuve.giocatcanh : null;
      }

      // Extract and transform passengers data
      if (data.passengers && Array.isArray(data.passengers) && data.passengers.length > 0) {
        const transformedPassengers = data.passengers.map((p: any) => {
          const passenger: any = {
            Họ: p.lastName || "",
            Tên: p.firstName || "",
            Hộ_chiếu: p.passportNumber || "B12345678",
            Giới_tính: p.gender === "Male" ? "nam" : "nữ",
            Quốc_tịch: p.quoctich,
            type: p.child ? "trẻ_em" : "người_lớn",
          };

          // Add infant if exists
          if (p.infant && Array.isArray(p.infant) && p.infant.length > 0) {
            const infantData = p.infant[0];
            passenger.infant = {
              Họ: infantData.lastName || "",
              Tên: infantData.firstName || "",
              Hộ_chiếu: "",
              Giới_tính: infantData.gender === "Unknown" ? "" : infantData.gender,
              Quốc_tịch: p.quoctich,
            };
          }

          return passenger;
        });

        flightData.passengers = transformedPassengers;
      }

      const { error } = await supabase.from("monitored_flights").insert(flightData);

      if (error) throw error;

      toast({
        title: "Đã thêm hành trình từ PNR",
        description: `PNR ${pnrCode}: ${data.chieudi.departure} → ${data.chieudi.arrival}`,
      });

      setIsPnrModalOpen(false);
      setPnrCode("");
      await fetchMonitoredFlights();
    } catch (error) {
      console.error("Error importing from PNR:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể nhập hành trình từ PNR",
      });
    } finally {
      setIsLoadingPnr(false);
    }
  };

  const generatePNR = (flightId: string) => {
    // Generate a consistent 6-character PNR from flight ID
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let hash = 0;
    for (let i = 0; i < flightId.length; i++) {
      hash = (hash << 5) - hash + flightId.charCodeAt(i);
      hash = hash & hash;
    }
    let pnr = "";
    for (let i = 0; i < 6; i++) {
      pnr += chars[Math.abs(hash >> (i * 5)) % chars.length];
    }
    return pnr;
  };

  const renderFlightSegments = (flight: MonitoredFlight) => {
    if (flight.airline === "VNA" && flight.segments && flight.segments.length > 0) {
      return (
        <div className="text-sm">
          <strong>
            {flight.segments.length > 1 ? `Hành trình đa chặng (${flight.segments.length} chặng):` : "Hành trình:"}
          </strong>
          <div className="mt-2 space-y-2">
            {flight.segments.map((seg: FlightSegment, idx: number) => (
              <div key={idx} className="ml-2">
                <span className="font-medium">Chặng {idx + 1}</span>
                <div className="ml-2 text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <span>
                      {seg.departure_airport} → {seg.arrival_airport}
                    </span>
                    {seg.ticket_class === "business" && (
                      <Badge variant="secondary" className="text-xs">
                        Thương gia
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFlightDate(seg.departure_date)}
                    {seg.departure_time && ` | ${seg.departure_time}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (flight.airline === "VJ") {
      if (flight.is_round_trip) {
        return (
          <div className="text-sm">
            <strong>Hành trình khứ hồi (2 chặng):</strong>
            <div className="mt-2 space-y-2">
              <div className="ml-2">
                <span className="font-medium">Chặng 1</span>
                <div className="ml-2 text-gray-700 dark:text-gray-300">
                  <div>
                    {flight.departure_airport} → {flight.arrival_airport}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFlightDate(flight.departure_date)}
                    {flight.departure_time && ` | ${flight.departure_time}`}
                  </div>
                </div>
              </div>
              <div className="ml-2">
                <span className="font-medium">Chặng 2</span>
                <div className="ml-2 text-gray-700 dark:text-gray-300">
                  <div>
                    {flight.arrival_airport} → {flight.departure_airport}
                  </div>
                  {flight.return_date && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFlightDate(flight.return_date)}
                      {flight.return_time && ` | ${flight.return_time}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      } else {
        return (
          <div className="text-sm">
            <strong>Hành trình:</strong>
            <div className="mt-2">
              <span className="font-medium ml-2">Chặng 1</span>
              <div className="ml-4 text-gray-700 dark:text-gray-300">
                <div>
                  {flight.departure_airport} → {flight.arrival_airport}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFlightDate(flight.departure_date)}
                  {flight.departure_time && ` | ${flight.departure_time}`}
                </div>
              </div>
            </div>
          </div>
        );
      }
    }
    return null;
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
            onClick={() => navigate("/")}
            className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Quay lại
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Tool Check Vé Giảm</h1>

          <div className="flex gap-2 mb-6 justify-center">
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Thêm hành trình thủ công
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Thêm hành trình theo dõi</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Hãng bay</Label>
                    <Select
                      value={airline}
                      onValueChange={(value: "VJ" | "VNA") => {
                        setAirline(value);
                        // Reset forms when switching airlines
                        setDepartureAirport("");
                        setArrivalAirport("");
                        setDepartureDate("");
                        setDepartureTime("");
                        setIsRoundTrip(false);
                        setReturnDate("");
                        setReturnTime("");
                        setVnaSegments([
                          {
                            departure_airport: "",
                            arrival_airport: "",
                            departure_date: "",
                            departure_time: "",
                            ticket_class: "economy",
                          },
                        ]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VJ">VietJet Air</SelectItem>
                        <SelectItem value="VNA">Vietnam Airlines</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {airline === "VJ" ? (
                    <>
                      <div>
                        <Label>Sân bay đi</Label>
                        <Select value={departureAirport} onValueChange={setDepartureAirport}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn sân bay" />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_AIRPORTS.map((code) => (
                              <SelectItem key={code} value={code}>
                                {code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Sân bay đến</Label>
                        <Select value={arrivalAirport} onValueChange={setArrivalAirport}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn sân bay" />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_AIRPORTS.map((code) => (
                              <SelectItem key={code} value={code}>
                                {code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Ngày bay</Label>
                        <Input
                          type="date"
                          value={departureDate}
                          onChange={(e) => setDepartureDate(e.target.value)}
                          min={getTodayString()}
                        />
                      </div>
                      <div>
                        <Label>Giờ đi (tùy chọn)</Label>
                        <Select value={departureTime} onValueChange={setDepartureTime}>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn giờ" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {TIME_OPTIONS.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="roundTrip"
                          checked={isRoundTrip}
                          onChange={(e) => setIsRoundTrip(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="roundTrip">Khứ hồi</Label>
                      </div>
                      {isRoundTrip && (
                        <>
                          <div>
                            <Label>Ngày về</Label>
                            <Input
                              type="date"
                              value={returnDate}
                              onChange={(e) => setReturnDate(e.target.value)}
                              min={departureDate || getTodayString()}
                            />
                          </div>
                          <div>
                            <Label>Giờ về (tùy chọn)</Label>
                            <Select value={returnTime} onValueChange={setReturnTime}>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn giờ" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[200px]">
                                {TIME_OPTIONS.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Hành trình</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setVnaSegments([
                                ...vnaSegments,
                                {
                                  departure_airport: "",
                                  arrival_airport: "",
                                  departure_date: "",
                                  departure_time: "",
                                  ticket_class: "economy",
                                },
                              ])
                            }
                            disabled={vnaSegments.length >= 4}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Thêm chặng
                          </Button>
                        </div>

                        {vnaSegments.map((segment, index) => (
                          <div key={index} className="p-4 border rounded-lg space-y-3 bg-blue-50 dark:bg-blue-950/20">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">Chặng {index + 1}</span>
                              {vnaSegments.length > 1 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setVnaSegments(vnaSegments.filter((_, i) => i !== index))}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Nơi đi</Label>
                                <Select
                                  value={segment.departure_airport}
                                  onValueChange={(value) => {
                                    const newSegments = [...vnaSegments];
                                    newSegments[index].departure_airport = value;
                                    setVnaSegments(newSegments);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ALL_AIRPORTS.map((code) => (
                                      <SelectItem key={code} value={code}>
                                        {code}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Nơi đến</Label>
                                <Select
                                  value={segment.arrival_airport}
                                  onValueChange={(value) => {
                                    const newSegments = [...vnaSegments];
                                    newSegments[index].arrival_airport = value;
                                    setVnaSegments(newSegments);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ALL_AIRPORTS.map((code) => (
                                      <SelectItem key={code} value={code}>
                                        {code}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Ngày đi</Label>
                                <Input
                                  type="date"
                                  value={segment.departure_date}
                                  onChange={(e) => {
                                    const newSegments = [...vnaSegments];
                                    newSegments[index].departure_date = e.target.value;
                                    setVnaSegments(newSegments);
                                  }}
                                  min={
                                    index === 0
                                      ? getTodayString()
                                      : vnaSegments[index - 1]?.departure_date || getTodayString()
                                  }
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Giờ đi (tùy chọn)</Label>
                                <Select
                                  value={segment.departure_time}
                                  onValueChange={(value) => {
                                    const newSegments = [...vnaSegments];
                                    newSegments[index].departure_time = value;
                                    setVnaSegments(newSegments);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn giờ" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[200px]">
                                    {TIME_OPTIONS.map((time) => (
                                      <SelectItem key={time} value={time}>
                                        {time}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs">Hạng vé</Label>
                              <Select
                                value={segment.ticket_class}
                                onValueChange={(value: "economy" | "business") => {
                                  const newSegments = [...vnaSegments];
                                  newSegments[index].ticket_class = value;
                                  setVnaSegments(newSegments);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="economy">Phổ thông</SelectItem>
                                  <SelectItem value="business">Thương gia</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

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

            <Dialog open={isPnrModalOpen} onOpenChange={setIsPnrModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Thêm hành trình từ PNR
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Thêm hành trình từ PNR</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Mã PNR</Label>
                    <Input
                      value={pnrCode}
                      onChange={(e) => setPnrCode(e.target.value.toUpperCase())}
                      placeholder="VD: CZ6B62"
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <Label>Hãng bay</Label>
                    <Select value={pnrAirline} onValueChange={(value: "VJ" | "VNA") => setPnrAirline(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VJ">VietJet</SelectItem>
                        <SelectItem value="VNA">Vietnam Airlines</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="exact-time" checked={exactTimeMatch} onCheckedChange={setExactTimeMatch} />
                    <Label htmlFor="exact-time">Bắt đúng giờ</Label>
                  </div>
                  <Button onClick={handleImportFromPnr} className="w-full" disabled={isLoadingPnr}>
                    {isLoadingPnr ? "Đang xử lý..." : "Xác nhận"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {flights.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Chưa có chuyến bay nào trong danh sách theo dõi</p>
                <p className="text-sm text-gray-400 mt-2">
                  Nhấn "Thêm hành trình thủ công" hoặc "Thêm hành trình từ PNR" để bắt đầu theo dõi giá vé
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {flights.map((flight) => (
                <Card
                  key={flight.id}
                  className={`${
                    flight.airline === "VNA"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-red-500 bg-red-50 dark:bg-red-950/20"
                  } ${!flight.is_active ? "opacity-50" : ""}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle
                          className={`flex items-center gap-2 ${
                            flight.airline === "VNA"
                              ? "text-blue-700 dark:text-blue-400"
                              : "text-red-700 dark:text-red-400"
                          }`}
                        >
                          {flight.pnr || generatePNR(flight.id)}
                          <Badge variant={flight.airline === "VNA" ? "default" : "destructive"}>{flight.airline}</Badge>
                        </CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenBookingModal(flight.id)}
                          title="Giữ vé"
                        >
                          <ShoppingBasket className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManualCheck(flight.id)}
                          disabled={checkingFlightId === flight.id}
                          title="Kiểm tra giá ngay"
                        >
                          <RefreshCw className={`h-4 w-4 ${checkingFlightId === flight.id ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant={flight.is_active ? "default" : "outline"}
                          onClick={() => handleToggleActive(flight.id, flight.is_active)}
                          title={flight.is_active ? "Tắt theo dõi" : "Bật theo dõi"}
                        >
                          {flight.is_active ? <Bell className="h-4 w-4" /> : <Bell className="h-4 w-4 opacity-50" />}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(flight.id)} title="Xóa">
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
                                ? `${flight.current_price.toLocaleString("vi-VN")} KRW`
                                : "Chưa có dữ liệu"}
                            </p>
                          </div>
                          <div>
                            <strong>Kiểm tra lần cuối:</strong>
                            <p>{formatDate(flight.last_checked_at)}</p>
                          </div>
                          <div>
                            <strong>Tần suất check:</strong>
                            <div className="flex items-center gap-2">
                              <p>Mỗi {flight.check_interval_minutes} phút</p>
                              <Dialog
                                open={editingFlightId === flight.id}
                                onOpenChange={(open) => {
                                  if (open) {
                                    setEditingFlightId(flight.id);
                                    setEditCheckInterval(flight.check_interval_minutes.toString());
                                  } else {
                                    setEditingFlightId(null);
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Chỉnh sửa tần suất check</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Kiểm tra mỗi (phút)</Label>
                                      <Input
                                        type="number"
                                        value={editCheckInterval}
                                        onChange={(e) => setEditCheckInterval(e.target.value)}
                                        min="5"
                                        placeholder="60"
                                      />
                                    </div>
                                    <Button
                                      onClick={() => handleUpdateInterval(flight.id, parseInt(editCheckInterval))}
                                      className="w-full"
                                    >
                                      Cập nhật
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                          <div>
                            <strong>Trạng thái:</strong>
                            <Badge variant={flight.is_active ? "default" : "secondary"}>
                              {flight.is_active ? "Đang theo dõi" : "Tạm dừng"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <strong>Giữ vé tự động:</strong>
                            <Switch
                              checked={flight.auto_hold_enabled || false}
                              onCheckedChange={() => handleToggleAutoHold(flight.id, flight.auto_hold_enabled || false)}
                            />
                            <span className="text-xs text-gray-500">{flight.auto_hold_enabled ? "Bật" : "Tắt"}</span>
                          </div>
                        </div>

                        {/* Progress bar for next check */}
                        {flight.is_active && (
                          <div className="mt-4 space-y-1">
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>Thời gian đến lần check tiếp theo:</span>
                              <span className="font-medium">
                                {getTimeUntilNextCheck(flight.last_checked_at, flight.check_interval_minutes)}
                              </span>
                            </div>
                            <Progress
                              value={calculateProgress(flight.last_checked_at, flight.check_interval_minutes)}
                              className="h-2"
                            />
                          </div>
                        )}

                        {/* Flight segments */}
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          {renderFlightSegments(flight)}
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

      {/* Booking Modal */}
      {selectedFlight && (
        <BookingModal
          isOpen={bookingModalOpen}
          onClose={() => {
            setBookingModalOpen(false);
            setSelectedFlight(null);
          }}
          bookingKey={selectedFlight.booking_key_departure || ""}
          bookingKeyReturn={selectedFlight.booking_key_return}
          tripType={selectedFlight.is_round_trip ? "RT" : "OW"}
          departureAirport={selectedFlight.departure_airport}
          maxSeats={9}
          mode="save"
          initialPassengers={selectedFlight.passengers}
          onSavePassengers={(passengers) => handleSavePassengers(selectedFlight.id, passengers)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
