import React from 'react';
import { LiveOrderMap, LiveOrderMapProps } from './LiveOrderMap.js';

export { LiveOrderMap };
export type { LiveOrderMapProps };

export const LiveRouteMap: React.FC<LiveOrderMapProps> = (props) => {
  return <LiveOrderMap {...props} />;
};
