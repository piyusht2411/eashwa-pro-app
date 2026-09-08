import React from 'react';

import ProfileScreen from '@/components/screens/ProfileScreen';

export default function DriverMoreScreen() {
  // Drivers have no account actions beyond logging out.
  return <ProfileScreen />;
}
