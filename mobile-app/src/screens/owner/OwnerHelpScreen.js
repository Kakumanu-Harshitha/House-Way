/**
 * OwnerHelpScreen
 * 
 * Help center with FAQs, tutorials, and support
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const FAQItem = ({ question, answer }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={styles.faqItem}>
      <TouchableOpacity 
        style={styles.faqQuestion}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.faqQuestionText}>{question}</Text>
        <Ionicons 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#6B7280" 
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

const OwnerHelpScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('faq'); // 'faq', 'tutorials', 'contact'

  const faqs = [
    {
      question: 'How do I create a new project?',
      answer: 'Go to the Projects tab, tap the "+" button in the top right corner, and fill in the project details including title, client, budget, and timeline.'
    },
    {
      question: 'How do I assign employees to a project?',
      answer: 'Open the project details, scroll to the Team section, tap "Add Team Member", and select employees from the list. You can assign roles and set permissions for each team member.'
    },
    {
      question: 'How do I create and send orders to vendors?',
      answer: 'Navigate to the Vendors tab, select a vendor, tap "Create Order", fill in the order details with items and quantities. The vendor will receive the order and can submit quotations through the chat interface.'
    },
    {
      question: 'How does the quotation negotiation work?',
      answer: 'Once an order is sent, the vendor submits a quotation. You can accept it, reject it, or submit a counter-offer. All negotiations happen in a chat-like interface. When a quotation is accepted, an invoice is automatically generated.'
    },
    {
      question: 'How do I track project finances?',
      answer: 'Go to the Finance tab to see receivables, payables, invoices, and purchase orders. You can filter by project, status, or date range. Charts and graphs provide visual insights into financial health.'
    },
    {
      question: 'How do I approve employee timesheets?',
      answer: 'Navigate to Employees > Attendance. Review submitted timesheets, verify hours and tasks, then approve or reject with comments. Approved timesheets are used for payroll calculations.'
    },
    {
      question: 'Can I export financial reports?',
      answer: 'Yes! In the Finance section, tap the export icon to download reports in PDF or Excel format. You can customize the date range and select which data to include.'
    },
    {
      question: 'How do I manage vendor invoices?',
      answer: 'Vendor invoices are automatically created when you accept a quotation. You can view all invoices in Finance > Payables, mark them as paid, and track payment history.'
    },
    {
      question: 'How do I add a new vendor?',
      answer: 'Go to Vendors tab, tap "+", and enter vendor details including company name, specialization, contact information, and payment terms.'
    },
    {
      question: 'Can I set project milestones?',
      answer: 'Yes! In project details, go to the Timeline section and add milestones with dates, deliverables, and payment schedules. Track progress and completion status.'
    }
  ];

  const tutorials = [
    {
      icon: 'play-circle',
      title: 'Getting Started',
      duration: '5 min',
      description: 'Learn the basics of navigating the platform'
    },
    {
      icon: 'briefcase',
      title: 'Managing Projects',
      duration: '8 min',
      description: 'Create, track, and complete projects efficiently'
    },
    {
      icon: 'people',
      title: 'Team Management',
      duration: '6 min',
      description: 'Add employees, assign roles, and manage permissions'
    },
    {
      icon: 'cash',
      title: 'Financial Management',
      duration: '10 min',
      description: 'Track invoices, payments, and budgets'
    },
    {
      icon: 'chatbubbles',
      title: 'Vendor Negotiations',
      duration: '7 min',
      description: 'Send orders and negotiate quotations'
    },
    {
      icon: 'stats-chart',
      title: 'Reports & Analytics',
      duration: '9 min',
      description: 'Generate insights from your data'
    }
  ];

  const handleContactSupport = (method) => {
    switch (method) {
      case 'email':
        Linking.openURL('mailto:support@houseway.com?subject=Support Request');
        break;
      case 'phone':
        Linking.openURL('tel:+911234567890');
        break;
      case 'whatsapp':
        Linking.openURL('https://wa.me/911234567890');
        break;
      case 'ticket':
        Alert.alert('Submit Ticket', 'Ticket submission form would open here');
        break;
    }
  };

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for help..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'faq' && styles.tabActive]}
          onPress={() => setActiveTab('faq')}
        >
          <Ionicons 
            name="help-circle-outline" 
            size={18} 
            color={activeTab === 'faq' ? '#FFC107' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'faq' && styles.tabTextActive]}>
            FAQs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tutorials' && styles.tabActive]}
          onPress={() => setActiveTab('tutorials')}
        >
          <Ionicons 
            name="play-circle-outline" 
            size={18} 
            color={activeTab === 'tutorials' ? '#FFC107' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'tutorials' && styles.tabTextActive]}>
            Tutorials
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'contact' && styles.tabActive]}
          onPress={() => setActiveTab('contact')}
        >
          <Ionicons 
            name="mail-outline" 
            size={18} 
            color={activeTab === 'contact' ? '#FFC107' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'contact' && styles.tabTextActive]}>
            Contact
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* FAQs Tab */}
        {activeTab === 'faq' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="frequently-asked-questions" size={24} color="#FFC107" />
              <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              {filteredFaqs.length} question{filteredFaqs.length !== 1 ? 's' : ''} found
            </Text>

            {filteredFaqs.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}

            {filteredFaqs.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No FAQs found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            )}
          </View>
        )}

        {/* Tutorials Tab */}
        {activeTab === 'tutorials' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Ionicons name="play-circle" size={24} color="#FFC107" />
              <Text style={styles.sectionTitle}>Video Tutorials</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Learn at your own pace with our video guides
            </Text>

            {tutorials.map((tutorial, index) => (
              <TouchableOpacity key={index} style={styles.tutorialCard}>
                <View style={styles.tutorialIcon}>
                  <Ionicons name={tutorial.icon} size={28} color="#FFC107" />
                </View>
                <View style={styles.tutorialInfo}>
                  <Text style={styles.tutorialTitle}>{tutorial.title}</Text>
                  <Text style={styles.tutorialDescription}>{tutorial.description}</Text>
                  <View style={styles.tutorialMeta}>
                    <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                    <Text style={styles.tutorialDuration}>{tutorial.duration}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Ionicons name="headset" size={24} color="#FFC107" />
              <Text style={styles.sectionTitle}>Contact Support</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Our team is here to help you 24/7
            </Text>

            <TouchableOpacity 
              style={styles.contactCard}
              onPress={() => handleContactSupport('email')}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="mail" size={24} color="#3B82F6" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Email Support</Text>
                <Text style={styles.contactDetail}>support@houseway.com</Text>
                <Text style={styles.contactTime}>Response within 24 hours</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contactCard}
              onPress={() => handleContactSupport('phone')}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="call" size={24} color="#10B981" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Phone Support</Text>
                <Text style={styles.contactDetail}>+91 123-456-7890</Text>
                <Text style={styles.contactTime}>Mon-Sat, 9 AM - 6 PM</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contactCard}
              onPress={() => handleContactSupport('whatsapp')}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#D1FAE5' }]}>
                <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>WhatsApp Chat</Text>
                <Text style={styles.contactDetail}>Quick responses</Text>
                <Text style={styles.contactTime}>Available 24/7</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contactCard}
              onPress={() => handleContactSupport('ticket')}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="document-text" size={24} color="#F59E0B" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Submit a Ticket</Text>
                <Text style={styles.contactDetail}>Detailed support request</Text>
                <Text style={styles.contactTime}>Track your request</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Quick Links */}
            <View style={styles.quickLinks}>
              <Text style={styles.quickLinksTitle}>Quick Links</Text>
              <TouchableOpacity style={styles.quickLink}>
                <Ionicons name="document-text-outline" size={18} color="#6B7280" />
                <Text style={styles.quickLinkText}>Documentation</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickLink}>
                <Ionicons name="logo-youtube" size={18} color="#6B7280" />
                <Text style={styles.quickLinkText}>YouTube Channel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickLink}>
                <Ionicons name="chatbubbles-outline" size={18} color="#6B7280" />
                <Text style={styles.quickLinkText}>Community Forum</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#FEF3C7',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#F59E0B',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 12,
  },
  tutorialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tutorialIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  tutorialInfo: {
    flex: 1,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  tutorialDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  tutorialMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tutorialDuration: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 2,
  },
  contactTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  quickLinks: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickLinksTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  quickLinkText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
});

export default OwnerHelpScreen;
