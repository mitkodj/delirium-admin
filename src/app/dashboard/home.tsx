import { View, Text, StyleSheet } from 'react-native';
import EventsTable from '../components/EventsTable';
import themeConfig from '../../themes/themeConfig';
import { Club, DEvent } from '../../types/Disco';
import { useEffect } from 'react';
import { useSearchFilters } from '../../providers/SearchCriteriaContext';
import { fetchEvents } from '../../utils/service';
import React from 'react';
import adminStyles from './styles/adminStyles';
import { Stack } from 'expo-router';

export default function DashboardHome() {
  const accentColor = themeConfig.text.primary;
  const club: Club = (globalThis as any).myClubs?.[0];
  const { events, setEvents } = useSearchFilters();
  
  const fetchEventsData = async () : Promise<DEvent[]> => {
      const events = await fetchEvents({} as any, 15, 0);
      return events?.data as any;
  };

  useEffect(() => {
      if (events.length === 0) {
          fetchEventsData().then((eventsData) => {
              setEvents(eventsData);
          });
      }
  }, []);

  const metrics = [
    { label: 'Event Visits', value: 134 },
    { label: 'Reserve Clicks', value: 23 },
    { label: 'Views', value: '25k' },
  ];

  return (
    <View style={adminStyles.adminPage}>
      <Text style={styles.title}>Hello, {club?.name}</Text>

      <View style={styles.actionsRow}>
        {metrics.map((metric) => (
          <View
            key={metric.label}
            style={[
              styles.squareButton,
              { borderColor: accentColor }
            ]}
          >
            <Text style={[styles.metricValue, { color: accentColor }]}>
              {metric.value}
            </Text>
            <Text style={styles.metricLabel}>
              {metric.label}
            </Text>
          </View>
        ))}
      </View>

      <EventsTable
        events={events}
        page={0}
        itemsPerPage={5}
        totalItems={5}
        onPageChange={() => { } } handleRefresh={function (): Promise<any> {
          throw new Error('Function not implemented.');
        } }  />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: themeConfig.text.primary,
    marginBottom: 32,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  squareButton: {
    width: '30%',
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: themeConfig.surface.primary,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  metricLabel: {
    marginTop: 6,
    fontSize: 12,
    color: '#7a72cc',
    textAlign: 'center',
  },
});