import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
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
  const sidebarWidth = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    Animated.spring(sidebarWidth, {
      toValue: sidebarOpen ? 60 : 0,
      useNativeDriver: false,
      overshootClamping: true,
    }).start();
  }, [sidebarOpen]);

  const topItems = [
    { route: '/dashboard/reservations', icon: 'ticket-outline' },
  ];

  const middleItems = [
    { route: '/dashboard/home', icon: 'home-outline' },
    { route: '/dashboard/events', icon: 'calendar-outline' },
  ];

  return (
    <PaperProvider theme={paperTheme}>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* SIDEBAR */}
        <Animated.View style={[styles.sidebar, { paddingTop: insets.top, width: sidebarWidth }]}>

          {/* TOP: toggle + reservations */}
          <View>
            <SidebarIcon
              icon="chevron-back"
              onPress={toggleSidebar}
            />
            {topItems.map((item: { route: string; icon: string }) => (
              <SidebarIcon
                key={item.route}
                icon={item.icon}
                active={pathname === item.route}
                onPress={() => router.replace(item.route)}
              />
            ))}
          </View>

          {/* MIDDLE: home + events */}
          <View>
            {middleItems.map((item: { route: string; icon: string }) => (
              <SidebarIcon
                key={item.route}
                icon={item.icon}
                active={pathname === item.route}
                onPress={() => router.replace(item.route)}
              />
            ))}
          </View>

          {/* BOTTOM ITEMS */}
          <View>
            <SidebarIcon
              icon="map-outline"
              active={pathname === '/dashboard/hostPanel'}
              onPress={() => router.replace('/dashboard/hostPanel')}
            />

            <SidebarIcon
              icon="images-outline"
              active={pathname === '/dashboard/photos'}
              onPress={() => router.replace('/dashboard/photos')}
            />

            <SidebarIcon
              icon="person-outline"
              active={pathname === '/dashboard/profile'}
              onPress={() => router.replace('/dashboard/profile')}
            />

            <SidebarIcon
              icon="exit-outline"
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

function SidebarIcon({ icon, onPress, active }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.iconWrapper,
        active && styles.activeIcon
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={active ? themeConfig.text.primary : themeConfig.text.muted}
      />
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
  iconWrapper: {
    padding: 14,
    marginVertical: 8,
    borderRadius: 12,
  },
  activeIcon: {
    backgroundColor: themeConfig.background.primary,
  },
  content: {
    flex: 1,
    paddingTop: 24,
    paddingRight: 24,
    paddingLeft: 0,
    backgroundColor: themeConfig.background.primary,
  },
});
