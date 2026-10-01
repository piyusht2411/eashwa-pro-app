import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeftRight, Factory, Lock, Users } from 'lucide-react-native';

import ProfileScreen from '@/components/screens/ProfileScreen';
import { usePortalSwitch } from '@/components/PortalSwitch';
import { colors } from '@/lib/theme';

export default function AdminMoreScreen() {
  const { canSwitch, target, confirmAndGo, labelOf } = usePortalSwitch();

  return (
    <ProfileScreen
      sections={[
        // Cross-portal admins run both portals from this account, so give the
        // switch its own section at the top rather than burying it in Manage.
        ...(canSwitch
          ? [
              {
                title: 'Portal',
                items: [
                  {
                    key: 'switch-portal',
                    icon:
                      target === 'production' ? (
                        <Factory size={18} color={colors.primaryDark} strokeWidth={2.2} />
                      ) : (
                        <ArrowLeftRight size={18} color={colors.primaryDark} strokeWidth={2.2} />
                      ),
                    label: `Switch to ${labelOf[target]} portal`,
                    onPress: () => confirmAndGo(),
                  },
                ],
              },
            ]
          : []),
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
