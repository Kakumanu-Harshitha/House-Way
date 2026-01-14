import React, { useEffect, useState } from 'react';
import { View, ScrollView, Image, Text, TouchableOpacity, Alert } from 'react-native';
import AppHeader from '../components/AppHeader';
import theme from '../../../styles/theme';
import { filesAPI } from '../../../utils/api';

export default function MediaGallery({ navigation }) {
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    load(); 
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      // Get media files for vendor's projects
      const res = await filesAPI.getFiles({ category: 'progress' });
      if (res.success) {
        // Transform files data to match the expected format
        const transformedItems = res.data.files.map((file, index) => ({
          id: file._id || index,
          title: file.name || `Image ${index + 1}`,
          uri: file.url
        }));
        setMediaItems(transformedItems);
      }
    } catch (error) {
      console.error('Error loading media:', error);
      Alert.alert('Error', 'Failed to load media gallery');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading media gallery...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex:1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Media Gallery" onMenu={() => navigation.openDrawer()} />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Milestone Highlights</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {mediaItems.map(it => (
            <TouchableOpacity key={it.id} style={{ width: '48%', marginBottom: 12 }}>
              <View style={{ height: 140, borderRadius: 12, backgroundColor: '#eee', alignItems:'center', justifyContent:'center' }}>
                {it.uri ? (
                  <Image 
                    source={{ uri: it.uri }} 
                    style={{ width: '100%', height: '100%', borderRadius: 12 }} 
                  />
                ) : (
                  <Text style={{ color: theme.colors.muted }}>{it.title}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
          {mediaItems.length === 0 && (
            <Text style={{ color: theme.colors.muted, textAlign: 'center', width: '100%', marginTop: 20 }}>
              No media files found
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}