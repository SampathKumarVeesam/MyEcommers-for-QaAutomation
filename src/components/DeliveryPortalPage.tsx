import { ArrowLeft, Truck } from 'lucide-react';
import React from 'react';
import { DeliveryAgentPortal } from './DeliveryAgentPortal.js';

interface DeliveryPortalPageProps {
  onNavigateHome: () => void;
}

export const DeliveryPortalPage: React.FC<DeliveryPortalPageProps> = ({ onNavigateHome }) => {
  return (
    <div className="min-h-screen bg-[#030611] flex flex-col">
      <DeliveryAgentPortal
        isOpen={true}
        onClose={onNavigateHome}
        isModal={false}
      />
    </div>
  );
};
