import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SunUpdatePnrPanel } from '@/components/update-pnr/SunUpdatePnrPanel';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const UpdatePnrModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [airline, setAirline] = useState<'SUN' | null>(null);

  useEffect(() => {
    if (!isOpen) setAirline(null);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>
            {airline === 'SUN' ? 'Cập nhật PNR - SunPQ' : 'Cập nhật PNR'}
          </DialogTitle>
        </DialogHeader>

        {!airline ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Chọn hãng cần cập nhật thông tin PNR:</p>
            <Button variant="outline" className="w-full justify-start" onClick={() => setAirline('SUN')}>
              <img src="/icon/sunpq-logo.png" alt="SunPQ" className="w-6 h-6 mr-2 rounded" />
              SunPQ (9G)
            </Button>
          </div>
        ) : (
          <SunUpdatePnrPanel onBack={() => setAirline(null)} />
        )}
      </DialogContent>
    </Dialog>
  );
};
