import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AdminTable from '../common/AdminTable';
import { formatEventDate } from '../../utils/formatDate';
import { DEvent } from '../../types/Disco';
import themeConfig from '../../theme/themeConfig';

type Props = {
    events: DEvent[];

    page: number;
    itemsPerPage: number;
    totalItems: number;

    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (count: number) => void;
    handleRefresh: () => Promise<any>;
    onEdit?: (event: DEvent) => void;
    onDelete?: (event: DEvent) => void;
};

export default function EventsTable({
    events,
    page,
    itemsPerPage,
    totalItems,
    onPageChange,
    handleRefresh,
    onEdit,
    onDelete,
}: Props) {

    const columns = [
        {
            title: 'Name',
            field: 'name',
        },
        {
            title: 'Date',
            render: (item: DEvent) => formatEventDate(item.startDate as Date),
        },
        {
            title: '',
            width: 72,
            render: (item: DEvent) => (
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <TouchableOpacity onPress={() => onEdit?.(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="create-outline" size={18} color={themeConfig.accent.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onDelete?.(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 0 }}>
                        <Ionicons name="trash-outline" size={18} color={themeConfig.accent.primary} />
                    </TouchableOpacity>
                </View>
            ),
        },
    ];

    return (
        <AdminTable
            data={events}
            columns={columns}
            page={page}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={onPageChange}
            handleRefresh={handleRefresh}
        />
    );
}