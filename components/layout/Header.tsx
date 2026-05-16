import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export function Header({ title, subtitle, showBack = false, rightElement }: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-primary px-4 pb-4"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          {showBack && (
            <TouchableOpacity
              onPress={() => router.back()}
              className="rounded-full bg-white/20 p-1.5"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <View className="flex-1">
            <Text className="text-xl font-bold text-white">{title}</Text>
            {subtitle ? (
              <Text className="text-sm text-white/80">{subtitle}</Text>
            ) : null}
          </View>
        </View>
        {rightElement && <View>{rightElement}</View>}
      </View>
    </View>
  );
}
