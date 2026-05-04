import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AdminTable from './AdminTable';
import { formatEventDate } from '../../utils/formatDate';
import { DEvent } from '../../types/Disco';
import themeConfig from '../../themes/themeConfig';

type Props = {
    events: DEvent[];

    page: number;
    itemsPerPage: number;
    totalItems: number;

    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (count: number) => void;
    handleRefresh: () => Promise<any>;
    onEdit?: (event: DEvent) => void;
};

export default function EventsTable({
    events,
    page,
    itemsPerPage,
    totalItems,
    onPageChange,
    handleRefresh,
    onEdit,
}: Props) {

    const columns = [
        {
            title: 'Name',
            field: 'name',
        },
        {
            title: 'Date',
            render: (item: DEvent) => formatEventDate(item.date as Date),
        },
        {
            title: '',
            width: 40,
            render: (item: DEvent) => (
                <TouchableOpacity onPress={() => onEdit?.(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="create-outline" size={18} color={themeConfig.accent.primary} />
                </TouchableOpacity>
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