import { Alert } from 'react-native';
import { DEvent } from '../types/Disco';
import { deleteEvent } from '../services/api';
import { useSearchFilters } from '../providers/SearchCriteriaContext';

export function useConfirmDeleteEvent(onDeleted?: (event: DEvent) => void) {
    const { setEvents } = useSearchFilters();

    return (event: DEvent) => {
        Alert.alert(
            'Delete event',
            `Would you really like to delete "${event.name}"?`,
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, delete it',
                    style: 'destructive',
                    onPress: async () => {
                        const res = await deleteEvent(event.id);
                        if (!res) {
                            Alert.alert('Error', 'Failed to delete the event. Please try again.');
                            return;
                        }
                        setEvents((prev) => prev.filter((e) => e.id !== event.id));
                        onDeleted?.(event);
                    },
                },
            ]
        );
    };
}
