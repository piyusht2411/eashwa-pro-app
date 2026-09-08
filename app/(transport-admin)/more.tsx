import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Lock, Users } from 'lucide-react-native';

import ProfileScreen from '@/components/screens/ProfileScreen';
import { colors } from '@/lib/theme';

export default function AdminMoreScreen() {
  return (
    <ProfileScreen
      sections={[
        {
          title: 'Manage',
          items: [
            {
              key: 'users',
              icon: <Users size={18} color={colors.primaryDark} strokeWidth={2.2} />,
              label: 'Manage Users',
              onPress: () => router.push('/(transport-admin)/users'),
            },
          ],
        },
        {
          title: 'Account',
          items: [
            {
              key: 'password',
              icon: <Lock size={18} color={colors.primaryDark} strokeWidth={2.2} />,
              label: 'Change Password',
              onPress: () => Alert.alert('Info', 'Change password functionality coming soon.'),
            },
          ],
        },
      ]}
    />
  );
}
