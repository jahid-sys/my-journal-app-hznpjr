
import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Label>Journal</Label>
        <Icon sf={{ default: 'book', selected: 'book.fill' }} drawable="menu-book" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
