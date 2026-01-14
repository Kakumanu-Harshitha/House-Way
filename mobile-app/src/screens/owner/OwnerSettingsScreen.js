/**
 * OwnerSettingsScreen
 * 
 * App settings and preferences for Owner/Admin
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const OwnerSettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    darkMode: false,
    compactView: false,
    autoRefresh: true,
    soundEffects: true,
    hapticFeedback: true,
    showCurrency: 'INR',
    language: 'English',
    timeFormat: '24h',
  });

  const handleToggle = (key) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the app cache? This will free up storage but may slow down initial loading.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Cache cleared successfully');
          }
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            setSettings({
              darkMode: false,
              compactView: false,
              autoRefresh: true,
              soundEffects: true,
              hapticFeedback: true,
              showCurrency: 'INR',
              language: 'English',
              timeFormat: '24h',
            });
            Alert.alert('Success', 'Settings reset to default');
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APPEARANCE</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon-outline" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Dark Mode</Text>
                <Text style={styles.settingSubtext}>Enable dark theme</Text>
              </View>
            </View>
            <Switch
              value={settings.darkMode}
              onValueChange={() => handleToggle('darkMode')}
              trackColor={{ false: '#D1D5DB', true: '#FFC107' }}
              thumbColor={settings.darkMode ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="view-compact-outline" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Compact View</Text>
                <Text style={styles.settingSubtext}>Show more items on screen</Text>
              </View>
            </View>
            <Switch
              value={settings.compactView}
              onValueChange={() => handleToggle('compactView')}
              trackColor={{ false: '#D1D5DB', true: '#FFC107' }}
              thumbColor={settings.compactView ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="language-outline" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Language</Text>
                <Text style={styles.settingSubtext}>{settings.language}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Data & Sync */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA & SYNC</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="refresh-outline" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Auto-Refresh</Text>
                <Text style={styles.settingSubtext}>Automatically refresh data</Text>
              </View>
            </View>
            <Switch
              value={settings.autoRefresh}
              onValueChange={() => handleToggle('autoRefresh')}
              trackColor={{ false: '#D1D5DB', true: '#FFC107' }}
              thumbColor={settings.autoRefresh ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="cloud-sync-outline" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Sync Frequency</Text>
                <Text style={styles.settingSubtext}>Every 5 minutes</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleClearCache}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="trash-outline" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Clear Cache</Text>
                <Text style={styles.settingSubtext}>Free up storage space</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="volume-high-outline" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Sound Effects</Text>
                <Text style={styles.settingSubtext}>Play sounds for actions</Text>
              </View>
            </View>
            <Switch
              value={settings.soundEffects}
              onValueChange={() => handleToggle('soundEffects')}
              trackColor={{ false: '#D1D5DB', true: '#FFC107' }}
              thumbColor={settings.soundEffects ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="vibrate" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Haptic Feedback</Text>
                <Text style={styles.settingSubtext}>Vibrate on interactions</Text>
              </View>
            </View>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={() => handleToggle('hapticFeedback')}
              trackColor={{ false: '#D1D5DB', true: '#FFC107' }}
              thumbColor={settings.hapticFeedback ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="currency-inr" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Currency</Text>
                <Text style={styles.settingSubtext}>{settings.showCurrency}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Time Format</Text>
                <Text style={styles.settingSubtext}>{settings.timeFormat === '24h' ? '24-hour' : '12-hour'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Privacy & Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRIVACY & SECURITY</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Privacy Policy</Text>
                <Text style={styles.settingSubtext}>View privacy terms</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Terms of Service</Text>
                <Text style={styles.settingSubtext}>View terms and conditions</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Data Permissions</Text>
                <Text style={styles.settingSubtext}>Manage app permissions</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="bug-outline" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Report a Bug</Text>
                <Text style={styles.settingSubtext}>Help us improve</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="star-outline" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>Rate App</Text>
                <Text style={styles.settingSubtext}>Leave us a review</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingText}>About</Text>
                <Text style={styles.settingSubtext}>Version 1.0.0</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DANGER ZONE</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleResetSettings}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="refresh-circle-outline" size={20} color="#EF4444" />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingText, { color: '#EF4444' }]}>
                  Reset Settings
                </Text>
                <Text style={styles.settingSubtext}>Restore default settings</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#EF4444" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingText, { color: '#EF4444' }]}>
                  Delete Account
                </Text>
                <Text style={styles.settingSubtext}>Permanently delete your account</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  settingSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
});

export default OwnerSettingsScreen;
