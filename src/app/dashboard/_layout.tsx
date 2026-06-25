import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform, useWindowDimensions } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import themeConfig from '../../themes/themeConfig';
import { PaperProvider } from 'react-native-paper';
import { paperTheme } from '../../themes/paperTheme';
import AdminHeader from '../components/AdminHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SidebarProvider, useSidebar } from '../../providers/SidebarContext';
import { ClubDataProvider } from '../../providers/ClubDataContext';
import { logout } from '../../utils/service';


const ROUTE_TITLE_MAP: any = {
  '/dashboard/home': 'Home',
  '/dashboard/events': 'Events',
  '/dashboard/photos': 'Photos',
  '/dashboard/reservations': 'Reservations',
  '/dashboard/profile': 'Profile',
  '/dashboard/hostPanel': 'Host Panel'
};

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <ClubDataProvider>
        <DashboardContent />
      </ClubDataProvider>
    </SidebarProvider>
  );
}

function DashboardContent() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const sidebarWidth = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    if (isTablet) return;
    Animated.spring(sidebarWidth, {
      toValue: sidebarOpen ? 60 : 0,
      useNativeDriver: false,
      overshootClamping: true,
    }).start();
  }, [sidebarOpen, isTablet]);

  const topItems = [
    { route: '/dashboard/reservations', icon: 'ticket-outline', label: 'Reservations' },
  ];

  const middleItems = [
    { route: '/dashboard/home', icon: 'home-outline', label: 'Home' },
    { route: '/dashboard/events', icon: 'calendar-outline', label: 'Events' },
  ];

  return (
    <PaperProvider theme={paperTheme}>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* SIDEBAR */}
        <Animated.View style={[
          styles.sidebar,
          { paddingTop: insets.top, width: isTablet ? 180 : sidebarWidth },
          isTablet && styles.sidebarTablet,
        ]}>

          {/* TOP: toggle (phone only) + reservations */}
          <View>
            {!isTablet && (
              <SidebarIcon icon="chevron-back" onPress={toggleSidebar} />
            )}
            {topItems.map((item) => (
              <SidebarIcon
                key={item.route}
                icon={item.icon}
                label={item.label}
                showLabel={isTablet}
                active={pathname === item.route}
                onPress={() => router.replace(item.route)}
              />
            ))}
          </View>

          {/* MIDDLE: home + events */}
          <View>
            {middleItems.map((item) => (
              <SidebarIcon
                key={item.route}
                icon={item.icon}
                label={item.label}
                showLabel={isTablet}
                active={pathname === item.route}
                onPress={() => router.replace(item.route)}
              />
            ))}
          </View>

          {/* BOTTOM ITEMS */}
          <View>
            <SidebarIcon
              icon="map-outline"
              label="Host Panel"
              showLabel={isTablet}
              active={pathname === '/dashboard/hostPanel'}
              onPress={() => router.replace('/dashboard/hostPanel')}
            />
            <SidebarIcon
              icon="images-outline"
              label="Photos"
              showLabel={isTablet}
              active={pathname === '/dashboard/photos'}
              onPress={() => router.replace('/dashboard/photos')}
            />
            <SidebarIcon
              icon="person-outline"
              label="Profile"
              showLabel={isTablet}
              active={pathname === '/dashboard/profile'}
              onPress={() => router.replace('/dashboard/profile')}
            />
            <SidebarIcon
              icon="exit-outline"
              label="Log Out"
              showLabel={isTablet}
              active={false}
              onPress={async () => {
                await logout();
                (globalThis as any).authToken = null;
                router.replace('/');
              }}
            />
          </View>

        </Animated.View>

        {/* MAIN CONTENT */}
        <View style={[styles.content, { paddingBottom: 24 + (Platform.OS === 'android' ? insets.bottom : 0) }]}>
          <Stack screenOptions={{
            header: () => <AdminHeader title={ROUTE_TITLE_MAP[pathname]} />,
            contentStyle: {
              backgroundColor: themeConfig.background.primary
            },
            animation: 'none'
          }} />
        </View>
      </View>
    </PaperProvider>
  );
}

function SidebarIcon({ icon, onPress, active, label, showLabel }: {
  icon: string;
  onPress: () => void;
  active?: boolean;
  label?: string;
  showLabel?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.iconWrapper,
        active && styles.activeIcon,
        showLabel && styles.iconWrapperTablet,
      ]}
    >
      <Ionicons
        name={icon as any}
        size={22}
        color={active ? themeConfig.text.primary : themeConfig.text.muted}
      />
      {showLabel && label && (
        <Text style={[styles.sidebarLabel, active && styles.sidebarLabelActive]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: themeConfig.background.primary,
  },
  sidebar: {
    backgroundColor: themeConfig.background.secondary,
    paddingVertical: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sidebarTablet: {
    alignItems: 'stretch',
    paddingHorizontal: 6,
  },
  iconWrapper: {
    padding: 14,
    marginVertical: 8,
    borderRadius: 12,
  },
  iconWrapperTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  activeIcon: {
    backgroundColor: themeConfig.background.primary,
  },
  sidebarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: themeConfig.text.muted,
    flexShrink: 1,
  },
  sidebarLabelActive: {
    color: themeConfig.text.primary,
  },
  content: {
    flex: 1,
    paddingTop: 24,
    paddingRight: 24,
    paddingLeft: 0,
    backgroundColor: themeConfig.background.primary,
  },
});
