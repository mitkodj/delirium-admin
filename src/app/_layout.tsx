import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { SearchCriteriaProvider } from '../providers/SearchCriteriaContext';
import themeStyles from '../themes/theme';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={[{ flex: 1 }, themeStyles.darkContainer]}>
            <SafeAreaProvider initialMetrics={initialWindowMetrics}>
                <SearchCriteriaProvider>
                    <Stack
                        screenOptions={{
                            headerStyle: { backgroundColor: 'transparent' },
                            headerTintColor: '#fff',
                            headerTitleStyle: { fontWeight: 'bold' },
                            animation: 'slide_from_right',
                        }}
                    >
                        <Stack.Screen name="index" options={{ headerShown: false }} />
                        <Stack.Screen name="login" />
                        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
                    </Stack>
                </SearchCriteriaProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
