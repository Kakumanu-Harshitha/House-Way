import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';

const COLORS = {
  primary: '#D4AF37',
  background: '#FFFFFF',
  text: '#1A1A1A',
  textMuted: '#6B7280',
};

export default function HelpScreen() {
  const helpItems = [
    {
      title: 'Getting Started',
      icon: 'play-circle',
      content: [
        '• Log in with your email and password',
        '• Complete your profile information',
        '• Set up your notifications preferences',
      ]
    },
    {
      title: 'Common Issues',
      icon: 'alert-circle',
      content: [
        '• Forgot password? Use the "Forgot Password" link on login screen',
        '• Not receiving notifications? Check your notification settings',
        '• Need to update profile? Go to Settings > View Profile',
      ]
    },
    {
      title: 'App Features',
      icon: 'star',
      content: [
        '• Dashboard: View your overview and statistics',
        '• Projects: Manage and track your projects',
        '• Profile: Update your personal information',
        '• Settings: Configure app preferences',
      ]
    },
  ];

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@houseway.com');
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+919999999999');
  };

  return (
    <View style={styles.container}>
      <CommonHeader title="Help & Support" userRole="" showNotifications={false} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {helpItems.map((item, idx) => (
          <View key={idx} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Feather name={item.icon} size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.sectionTitle}>{item.title}</Text>
            </View>
            <View style={styles.sectionBody}>
              {item.content.map((line, lineIdx) => (
                <Text key={lineIdx} style={styles.sectionContent}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        ))}
        
        {/* Contact Support */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <Feather name="headphones" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Contact Support</Text>
          </View>
          <View style={styles.sectionBody}>
            <TouchableOpacity style={styles.contactButton} onPress={handleEmailSupport}>
              <Feather name="mail" size={18} color={COLORS.primary} />
              <Text style={styles.contactText}>support@houseway.com</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={handleCallSupport}>
              <Feather name="phone" size={18} color={COLORS.primary} />
              <Text style={styles.contactText}>+91 XXXX-XXX-XXXX</Text>
            </TouchableOpacity>
            <View style={styles.hoursContainer}>
              <Feather name="clock" size={16} color="#999" />
              <Text style={styles.hoursText}>Monday-Friday, 9 AM - 6 PM IST</Text>
            </View>
          </View>
        </View>
        
        {/* FAQ Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <Feather name="help-circle" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          </View>
          <View style={styles.sectionBody}>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How do I reset my password?</Text>
              <Text style={styles.faqAnswer}>Go to the login screen and click "Forgot Password". Enter your email to receive a reset link.</Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How do I update my profile photo?</Text>
              <Text style={styles.faqAnswer}>Navigate to Profile, then tap on your profile picture to upload a new photo.</Text>
            </View>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Who do I contact for technical issues?</Text>
              <Text style={styles.faqAnswer}>Email us at support@houseway.com or call during business hours.</Text>
            </View>
          </View>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: 'rgba(184, 134, 11, 0.05)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionBody: {
    padding: 16,
  },
  sectionContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 22,
    paddingLeft: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(184, 134, 11, 0.08)',
    borderRadius: 10,
    marginBottom: 10,
  },
  contactText: {
    marginLeft: 12,
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  hoursText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#999',
  },
  faqItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
