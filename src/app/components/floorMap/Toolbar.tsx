import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FloorObjectType } from '../../../types/FloorMap';
import themeConfig from '../../../themes/themeConfig';

interface ToolItem {
  type: FloorObjectType;
  label: string;
  shape: 'circle' | 'rect';
  color: string;
}

const TOOLS: ToolItem[] = [
  { type: 'table_circle',   label: 'Table',      shape: 'circle', color: '#7a72cc' },
  { type: 'table_vip_rect', label: 'Sq. Table',  shape: 'rect',   color: '#7a72cc' },
  { type: 'stage_circle',   label: 'Structure',  shape: 'circle', color: '#9b7acc' },
  { type: 'stage_rect',     label: 'Str. Rect',  shape: 'rect',   color: '#9b7acc' },
];

interface Props {
  onAdd: (type: FloorObjectType) => void;
}

export default function Toolbar({ onAdd }: Props) {
  return (
    <View style={styles.container}>
      {TOOLS.map(tool => (
        <TouchableOpacity
          key={tool.type}
          style={styles.toolButton}
          onPress={() => onAdd(tool.type)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.shapePreview,
            { borderColor: tool.color, borderRadius: tool.shape === 'circle' ? 10 : 3 },
          ]} />
          <Text style={[styles.toolLabel, { color: tool.color }]}>{tool.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeConfig.background.secondary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  toolButton: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 6,
    backgroundColor: themeConfig.background.primary,
  },
  shapePreview: {
    width: 20,
    height: 20,
    borderWidth: 2,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  toolLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
