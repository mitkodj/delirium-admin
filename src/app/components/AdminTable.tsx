import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { DataTable } from 'react-native-paper';
import themeConfig from '../../themes/themeConfig';

type Props = {
  data: any[];

  columns: any[];
  page: number;
  itemsPerPage: number;
  totalItems: number;

  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (count: number) => void;
  handleRefresh: () => Promise<any>;
};

export default function AdminTable({
  data,
  columns,
  page,
  itemsPerPage,
  totalItems,
  onPageChange,
  handleRefresh,
}: Props) {
  const from = page * itemsPerPage;
  const to = Math.min((page + 1) * itemsPerPage, totalItems);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDataRefresh = () => {
    setIsRefreshing(true);
    handleRefresh()
      .finally(() => setIsRefreshing(false));
  };
  
  
  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleDataRefresh}
            tintColor="#fff"      // spinner color on iOS
            colors={['#fff']}     // spinner color on Android
          />
        }
      >
      <DataTable>

        <DataTable.Header style={styles.header}>
          {
            columns.map(column => (
              <DataTable.Title key={column.title} style={column?.width ? {maxWidth: column?.width} : {}} textStyle={styles.headerText}>
                { column.title }
              </DataTable.Title>
            ))
          }
        </DataTable.Header>

        {data.map((item) => (
          <DataTable.Row key={item.id}>
            {
              columns.map(column => (
                <DataTable.Cell key={column.title} style={column?.width ? {maxWidth: column?.width} : {}} textStyle={styles.cellText}>
                      { (column.field ? item[column.field] : column.render(item)) }
                </DataTable.Cell>
              ))
            }
          </DataTable.Row>
        ))}

        <DataTable.Pagination
          page={page}
          numberOfPages={Math.ceil(totalItems / itemsPerPage)}
          onPageChange={onPageChange}

          label={`${from + 1}-${to} of ${totalItems}`}

          numberOfItemsPerPage={itemsPerPage}

          showFastPaginationControls
        />

      </DataTable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: themeConfig.surface.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeConfig.border.subtle,
    overflow: 'hidden',
  },

  header: {
    backgroundColor: themeConfig.background.secondary,
  },

  headerText: {
    color: themeConfig.text.primary,
    fontWeight: '600',
  },

  cellText: {
    color: themeConfig.text.primary,
  },
});